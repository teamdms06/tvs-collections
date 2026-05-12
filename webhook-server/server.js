const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT || 3001);
const HOST_LABEL = process.env.HOST_LABEL || "192.168.114.241";
const ALLOWED_DIALER_IPS = new Set(
  (process.env.ALLOWED_DIALER_IPS || "192.168.114.212,10.42.33.203")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean)
);

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
    : forwardedFor?.split(",")[0]?.trim() || req.socket.remoteAddress || req.ip || "";

  return rawIp.replace(/^::ffff:/, "");
}

function getRequestData(req) {
  if (req.method === "POST") {
    return req.body || {};
  }

  return req.query || {};
}

function handleCampaignWebhook(req, res) {
  const campaignId = String(req.params.campaignId || "").trim().toUpperCase();
  const data = getRequestData(req);
  const caller = data.phoneNo || data.phone || data.mobile || data.caller || "Unknown";
  const clientIp = normalizeClientIp(req);
  const observedAt = new Date().toISOString();

  if (!campaignId) {
    return res.status(400).json({ error: "campaignId is required in the webhook URL" });
  }

  if (ALLOWED_DIALER_IPS.size > 0 && !ALLOWED_DIALER_IPS.has(clientIp)) {
    console.log(`[${observedAt}] Ignored webhook from ${clientIp}: campaign=${campaignId}, caller=${caller}`);
    return res.sendStatus(403);
  }

  const payload = {
    campaignId,
    caller,
    clientIp,
    observedAt,
  };

  console.log(`[${observedAt}] Campaign webhook hit: campaign=${campaignId}, caller=${caller}, from=${clientIp}`);
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

app.all("/webhook/:campaignId", handleCampaignWebhook);
app.all("/:campaignId/webhook", handleCampaignWebhook);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Campaign webhook observer running at http://${HOST_LABEL}:${PORT}`);
  console.log(`Use URLs like http://${HOST_LABEL}:${PORT}/webhook/TVSTWG?phoneNo=8956236598`);
  console.log(`Also supported: http://${HOST_LABEL}:${PORT}/tvstwg/webhook?phoneNo=8956236598`);
});
