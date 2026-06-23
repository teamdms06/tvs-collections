const express = require("express");
const http = require("http");
const https = require("https");
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT || 3001);
const HOST_LABEL = process.env.HOST_LABEL || "192.168.114.241";
const BACKEND_API_URL = String(process.env.BACKEND_API_URL || "http://localhost:4000/api").replace(/\/$/, "");
const HIT_CALL_WEBHOOK_SECRET = process.env.HIT_CALL_WEBHOOK_SECRET || "";
const ALLOWED_DIALER_IPS = new Set(
  (process.env.ALLOWED_DIALER_IPS || "192.168.114.212")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean),
);
const HIT_CALL_RETRY_INTERVAL_MS = Number(process.env.HIT_CALL_RETRY_INTERVAL_MS || 10000);
const HIT_CALL_RETRY_BATCH_SIZE = Number(process.env.HIT_CALL_RETRY_BATCH_SIZE || 50);
const pendingHitCallSaves = [];
const hitCallSaveStats = {
  success: 0,
  failed: 0,
  queued: 0,
  retried: 0,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastFailure: "",
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function normalizeClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const rawIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      req.ip ||
      "";

  return rawIp.replace(/^::ffff:/, "");
}

function getRequestData(req) {
  if (req.method === "POST") {
    return req.body || {};
  }

  return req.query || {};
}

function buildHitCallRequest(payload) {
  return {
    observedAt: payload.observedAt,
    campaignId: payload.campaignId,
    caller: payload.caller,
    callId: payload.callId || "",
    callPayloadJson: JSON.stringify(payload),
  };
}

async function postHitCall(payload) {
  const response = await postJson(`${BACKEND_API_URL}/webhook/hit-calls`, buildHitCallRequest(payload));

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`${response.statusCode} ${response.body}`);
  }

  return response.body ? JSON.parse(response.body) : null;
}

function rememberHitCallFailure(payload, error, queueForRetry) {
  const message = error?.message || "Unknown backend save error";

  hitCallSaveStats.failed += 1;
  hitCallSaveStats.lastFailureAt = new Date().toISOString();
  hitCallSaveStats.lastFailure = message;

  if (queueForRetry) {
    pendingHitCallSaves.push({
      payload,
      attempts: 1,
      firstFailedAt: hitCallSaveStats.lastFailureAt,
      lastFailedAt: hitCallSaveStats.lastFailureAt,
      lastError: message,
    });
    hitCallSaveStats.queued += 1;
  }

  console.warn(`[${payload.observedAt}] Hit call save failed: ${message}`);
}

async function saveHitCall(payload, { queueForRetry = true } = {}) {
  try {
    const savedHitCall = await postHitCall(payload);

    hitCallSaveStats.success += 1;
    hitCallSaveStats.lastSuccessAt = new Date().toISOString();
    return savedHitCall;
  } catch (error) {
    rememberHitCallFailure(payload, error, queueForRetry);
    return null;
  }
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const payload = JSON.stringify(body);
    const transport = target.protocol === "https:" ? https : http;
    const request = transport.request(
      {
        method: "POST",
        hostname: target.hostname,
        port: target.port || (target.protocol === "https:" ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          ...(HIT_CALL_WEBHOOK_SECRET
            ? { "X-Hit-Call-Secret": HIT_CALL_WEBHOOK_SECRET }
            : {}),
        },
      },
      (response) => {
        let responseBody = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          responseBody += chunk;
        });
        response.on("end", () => {
          resolve({
            statusCode: response.statusCode || 0,
            body: responseBody,
          });
        });
      },
    );

    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

async function handleCampaignWebhook(req, res) {
  const campaignId = String(req.params.campaignId || "")
    .trim()
    .toUpperCase();
  const data = getRequestData(req);
  const caller =
    data.phoneNo || data.phone || data.mobile || data.caller || "Unknown";
  const clientIp = normalizeClientIp(req);
  const date = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const observedAt = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.000+05:30`;

  if (!campaignId) {
    return res
      .status(400)
      .json({ error: "campaignId is required in the webhook URL" });
  }

  if (ALLOWED_DIALER_IPS.size > 0 && !ALLOWED_DIALER_IPS.has(clientIp)) {
    console.log(
      `[${observedAt}] Ignored webhook from ${clientIp}: campaign=${campaignId}, caller=${caller}`,
    );
    return res.sendStatus(403);
  }

  const payload = {
    campaignId,
    caller,
    clientIp,
    observedAt,
    callId:
      data.callId ||
      data.leadId ||
      data.uniqueid ||
      data.callerId ||
      "",
    raw: data,
  };

  console.log(
    `[${observedAt}] Campaign webhook hit: campaign=${campaignId}, caller=${caller}, from=${clientIp}`,
  );
  const savedHitCall = await saveHitCall(payload);
  payload.hitCallSaved = Boolean(savedHitCall?.id);
  if (savedHitCall?.id) {
    payload.hitCallLogId = savedHitCall.id;
  } else {
    console.warn(
      `[${observedAt}] Campaign webhook hit was not persisted before socket emit: campaign=${campaignId}, caller=${caller}`,
    );
  }

  io.emit("campaign_call_observed", payload);

  return res.status(200).json({ ok: true, ...payload });
}

io.on("connection", (socket) => {
  console.log(`Browser observer connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Browser observer disconnected: ${socket.id}`);
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "campaign-webhook-observer" });
});

app.get("/hit-call-save-status", (req, res) => {
  res.json({
    ok: true,
    backendTarget: `${BACKEND_API_URL}/webhook/hit-calls`,
    secretConfigured: Boolean(HIT_CALL_WEBHOOK_SECRET),
    allowedDialerIps: [...ALLOWED_DIALER_IPS],
    pendingRetryCount: pendingHitCallSaves.length,
    ...hitCallSaveStats,
    oldestPending: pendingHitCallSaves[0]
      ? {
          observedAt: pendingHitCallSaves[0].payload.observedAt,
          campaignId: pendingHitCallSaves[0].payload.campaignId,
          caller: pendingHitCallSaves[0].payload.caller,
          attempts: pendingHitCallSaves[0].attempts,
          firstFailedAt: pendingHitCallSaves[0].firstFailedAt,
          lastFailedAt: pendingHitCallSaves[0].lastFailedAt,
          lastError: pendingHitCallSaves[0].lastError,
        }
      : null,
  });
});

app.all("/webhook/:campaignId", handleCampaignWebhook);
app.all("/:campaignId/webhook", handleCampaignWebhook);

setInterval(async () => {
  if (pendingHitCallSaves.length === 0) {
    return;
  }

  const batch = pendingHitCallSaves.splice(0, HIT_CALL_RETRY_BATCH_SIZE);

  for (const pendingHitCall of batch) {
    try {
      await postHitCall(pendingHitCall.payload);
      hitCallSaveStats.success += 1;
      hitCallSaveStats.retried += 1;
      hitCallSaveStats.lastSuccessAt = new Date().toISOString();
      console.log(
        `[${pendingHitCall.payload.observedAt}] Retried hit call save succeeded: campaign=${pendingHitCall.payload.campaignId}, caller=${pendingHitCall.payload.caller}`,
      );
    } catch (error) {
      const failedAt = new Date().toISOString();
      pendingHitCall.attempts += 1;
      pendingHitCall.lastFailedAt = failedAt;
      pendingHitCall.lastError = error?.message || "Unknown backend save error";
      pendingHitCallSaves.push(pendingHitCall);
      hitCallSaveStats.failed += 1;
      hitCallSaveStats.lastFailureAt = failedAt;
      hitCallSaveStats.lastFailure = pendingHitCall.lastError;
    }
  }
}, HIT_CALL_RETRY_INTERVAL_MS);

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Campaign webhook observer running at http://${HOST_LABEL}:${PORT}`,
  );
  console.log(`Hit call backend target: ${BACKEND_API_URL}/webhook/hit-calls`);
  console.log(
    `Hit call webhook secret: ${HIT_CALL_WEBHOOK_SECRET ? "configured" : "not configured"}`,
  );
  console.log(
    `Use URLs like http://${HOST_LABEL}:${PORT}/webhook/TVSTWG?phoneNo=8956236598`,
  );
  console.log(
    `Also supported: http://${HOST_LABEL}:${PORT}/tvstwg/webhook?phoneNo=8956236598`,
  );
});
