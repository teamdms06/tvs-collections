import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDialerAgent, getDialerAgents, getDialerAgentStatuses } from "../../api/admin";
import { DataTable } from "./shared";
import { formatNumber } from "./utils";

const LOW_CALL_COUNT_PRIORITY_CAMPAIGNS = new Set([
  "TVSTRLH",
  "TVSTRLG",
  "TVSTRLF",
]);

const DIALER_REFRESH_SECONDS = 4;
const DIALER_AGENT_STATUS_REFRESH_SECONDS = 2;
const DIALER_AGENT_STATUS_FALLBACK_CONCURRENCY = 4;
const DIALER_PAUSE_WARN_SECONDS = 5 * 60;
const DIALER_WAIT_WARN_SECONDS = 3 * 60;
const DIALER_INCALL_WARN_SECONDS = 10 * 60;
const DIALER_TIMER_STORAGE_KEY = "tvsDialerTimerState";
const DIALER_SUB_STATUS_TIMER_STORAGE_KEY = "tvsDialerSubStatusTimerState";
const WEBHOOK_SOCKET_URL = import.meta.env.VITE_WEBHOOK_SOCKET_URL || "http://192.168.114.241:3001";
const DIALER_CAMPAIGNS = [
  "TVSCRCLP",
  "TVSCRCLB",
  "TVSCRCLG",
  "TVSPTPFK",
  "TVSPTPFH",
  "TVSPTPFG",
  "TVSCSNB",
  "TVSTLKA",
  "TVSTWOD",
  "TVSTWH",
  "TVSTWG",
  "TVSTRLH",
  "TVSTRLG",
  "TVSTRLF",
];
const DIALER_ALLOWED_CAMPAIGNS = new Set(DIALER_CAMPAIGNS);
const dialerStatuses = [
  { key: "ALL", label: "ALL" },
  { key: "READY", label: "READY" },
  { key: "PAUSED", label: "PAUSED" },
  { key: "INCALL", label: "In Call" },
  { key: "INDEAD", label: "In Dead" },
  { key: "DISPO", label: "In Dispo" },
];

function getAgentSubStatus(agent, subStatusesByUser = {}) {
  return String(subStatusesByUser?.[agent.user] || "").trim().toUpperCase();
}

function isAgentInDead(agent, subStatusesByUser = {}) {
  return isWrapDeadSubStatus(getAgentSubStatus(agent, subStatusesByUser));
}

function isAgentInDispo(agent, subStatusesByUser = {}) {
  return isDispoSubStatus(getAgentSubStatus(agent, subStatusesByUser));
}

function getAgentDisplayStatus(agent, subStatusesByUser = {}) {
  if (isAgentInDead(agent, subStatusesByUser)) {
    return "INDEAD";
  }

  if (isAgentInDispo(agent, subStatusesByUser)) {
    return "DISPO";
  }

  return String(agent.status || "UNKNOWN").trim().toUpperCase();
}

function getDialerStatusCounts(agents, subStatusesByUser = {}) {
  const counts = {
    total: agents.length,
    ready: 0,
    paused: 0,
    incall: 0,
    dead: 0,
    dispo: 0,
  };

  for (const agent of agents) {
    const status = getAgentDisplayStatus(agent, subStatusesByUser);

    if (status === "READY") {
      counts.ready += 1;
    } else if (status === "PAUSED") {
      counts.paused += 1;
    } else if (status === "INCALL") {
      counts.incall += 1;
    }

    if (status === "INDEAD") {
      counts.dead += 1;
    }

    if (status === "DISPO") {
      counts.dispo += 1;
    }
  }

  return counts;
}

function parseDialerCsv(text) {
  return text
    .trim()
    .split("\n")
    .map((line) => line.split(","))
    .filter((parts) => parts.length >= 8 && parts[0]?.trim() !== "user")
    .map((parts) => ({
      user: parts[0]?.trim() || "",
      campaignId: parts[1]?.trim() || "",
      sessionId: parts[2]?.trim() || "",
      status: parts[3]?.trim() || "UNKNOWN",
      leadId: parts[4]?.trim() || "",
      callerId: parts[5]?.trim() || "",
      callsToday: Number.parseInt(parts[6], 10) || 0,
      fullName: parts[7]?.trim() || parts[0]?.trim() || "",
      userLevel: parts[8]?.trim() || "1",
    }))
    .filter((agent) =>
      DIALER_ALLOWED_CAMPAIGNS.has(agent.campaignId.toUpperCase()),
    );
}

function parseDialerAgentStatusCsv(text) {
  const rows = String(text || "")
    .trim()
    .split("\n")
    .map((line) => line.split(",").map((part) => part.trim()))
    .filter((parts) => parts.some(Boolean));

  if (rows.length === 0) {
    return null;
  }

  const headerRow = rows[0].map((header) =>
    header.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""),
  );
  const valueRow = headerRow.includes("status") ? rows[1] : rows[0];

  if (!valueRow) {
    return null;
  }

  const fieldNames = headerRow.includes("status")
    ? headerRow
    : [
        "status",
        "callerid",
        "lead_id",
        "campaign_id",
        "calls_today",
        "full_name",
        "user_group",
        "user_level",
        "pause_code",
        "real_time_sub_status",
        "phone_number",
        "vendor_lead_code",
        "session_id",
      ];

  return fieldNames.reduce((detail, fieldName, index) => {
    detail[fieldName] = valueRow[index] || "";
    return detail;
  }, {});
}

function syncDialerTimerState(currentState, agents) {
  const now = Date.now();
  const nextState = {};

  for (const agent of agents) {
    const key = agent.user;
    const status = agent.status.toUpperCase();
    const previous = currentState[key];
    const campaignId = agent.campaignId.toUpperCase();
    const sessionId = agent.sessionId || "";
    const isTimedStatus =
      status === "READY" || status === "PAUSED" || status === "INCALL";
    const shouldKeepTimer =
      previous?.status === status &&
      previous?.campaignId === campaignId &&
      previous?.sessionId === sessionId;

    if (shouldKeepTimer) {
      nextState[key] = {
        ...previous,
        campaignId,
        sessionId,
      };
    } else {
      nextState[key] = {
        campaignId,
        sessionId,
        status,
        startedAt: isTimedStatus ? now : null,
      };
    }
  }

  return nextState;
}

function readDialerTimerState() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawTimerState = window.localStorage.getItem(DIALER_TIMER_STORAGE_KEY);
    const parsedTimerState = rawTimerState ? JSON.parse(rawTimerState) : {};

    if (!parsedTimerState || typeof parsedTimerState !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedTimerState).filter(
        ([, timer]) =>
          timer &&
          typeof timer === "object" &&
          typeof timer.campaignId === "string" &&
          typeof timer.sessionId === "string" &&
          typeof timer.status === "string" &&
          (typeof timer.startedAt === "number" || timer.startedAt === null),
      ),
    );
  } catch {
    return {};
  }
}

function readDialerSubStatusTimerState() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawTimerState = window.localStorage.getItem(DIALER_SUB_STATUS_TIMER_STORAGE_KEY);
    const parsedTimerState = rawTimerState ? JSON.parse(rawTimerState) : {};

    if (!parsedTimerState || typeof parsedTimerState !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedTimerState).filter(
        ([, timer]) =>
          timer &&
          typeof timer === "object" &&
          typeof timer.leadId === "string" &&
          typeof timer.sessionId === "string" &&
          typeof timer.status === "string" &&
          typeof timer.subStatus === "string" &&
          (timer.timerType === "wrapDead" || timer.timerType === "dispo") &&
          typeof timer.startedAt === "number",
      ),
    );
  } catch {
    return {};
  }
}

function saveDialerTimerState(timerState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      DIALER_TIMER_STORAGE_KEY,
      JSON.stringify(timerState),
    );
  } catch {
    // Storage can be unavailable in restricted browser modes. Timers still work in memory.
  }
}

function saveDialerSubStatusTimerState(timerState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      DIALER_SUB_STATUS_TIMER_STORAGE_KEY,
      JSON.stringify(timerState),
    );
  } catch {
    // Storage can be unavailable in restricted browser modes. Timers still work in memory.
  }
}

function formatDuration(totalSeconds) {
  if (totalSeconds === null) {
    return "-";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isWrapDeadSubStatus(subStatus) {
  const normalizedSubStatus = String(subStatus || "").trim().toUpperCase();

  return (
    normalizedSubStatus === "DEAD" ||
    normalizedSubStatus === "WRAP" ||
    normalizedSubStatus === "WRAPUP" ||
    normalizedSubStatus === "WRAP_UP"
  );
}

function isDispoSubStatus(subStatus) {
  const normalizedSubStatus = String(subStatus || "").trim().toUpperCase();

  return (
    normalizedSubStatus === "DISPO" ||
    normalizedSubStatus === "DISPOSITION" ||
    normalizedSubStatus === "DISPOSITIONING"
  );
}

function getDialerDetailSubStatus(detail) {
  return String(
    detail?.real_time_sub_status ||
      detail?.user_sub_status ||
      detail?.sub_status ||
      "",
  )
    .trim()
    .toUpperCase();
}

function syncDialerSubStatusTimerState(currentState, statusResults) {
  const now = Date.now();
  const nextState = {};

  statusResults.forEach((result) => {
    const agentUser = result.value?.agentUser;

    if (!agentUser) {
      return;
    }

    if (result.status !== "fulfilled" || !result.value.detail) {
      if (currentState[agentUser]) {
        nextState[agentUser] = currentState[agentUser];
      }
      return;
    }

    const { detail } = result.value;
    const subStatus = getDialerDetailSubStatus(detail);
    const status = String(detail.status || "").trim().toUpperCase();
    const sessionId = String(detail.session_id || "").trim();
    const leadId = String(detail.lead_id || "").trim();
    const timerType = isWrapDeadSubStatus(subStatus)
      ? "wrapDead"
      : isDispoSubStatus(subStatus)
        ? "dispo"
        : "";

    if (!timerType) {
      return;
    }

    const previous = currentState[agentUser];
    const shouldKeepTimer =
      previous?.timerType === timerType &&
      previous?.subStatus === subStatus &&
      previous?.status === status &&
      previous?.sessionId === sessionId &&
      previous?.leadId === leadId;

    nextState[agentUser] = shouldKeepTimer
      ? previous
      : {
          leadId,
          sessionId,
          status,
          subStatus,
          timerType,
          startedAt: now,
        };
  });

  return nextState;
}

function getDialerSubStatusesByUser(statusResults) {
  return Object.fromEntries(
    statusResults
      .filter((result) => result.status === "fulfilled" && result.value?.agentUser)
      .map((result) => [
        result.value.agentUser,
        getDialerDetailSubStatus(result.value.detail),
      ]),
  );
}

function getDialerElapsed(timerState, user, nowTick) {
  const timer = timerState[user];
  if (!timer?.startedAt) {
    return null;
  }

  return Math.max(0, Math.floor((nowTick - timer.startedAt) / 1000));
}

function getDialerElapsedMs(timerState, user, nowTick) {
  const timer = timerState[user];
  if (!timer?.startedAt) {
    return null;
  }

  return Math.max(0, nowTick - timer.startedAt);
}

function loadSocketIoClient(serverUrl) {
  if (window.io) {
    return Promise.resolve(window.io);
  }

  const existingScript = document.querySelector(`script[data-socket-io-client="${serverUrl}"]`);

  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve(window.io), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${serverUrl}/socket.io/socket.io.js`;
    script.async = true;
    script.dataset.socketIoClient = serverUrl;
    script.onload = () => resolve(window.io);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      try {
        results[currentIndex] = {
          status: "fulfilled",
          value: await mapper(items[currentIndex], currentIndex),
        };
      } catch (reason) {
        results[currentIndex] = {
          status: "rejected",
          reason,
          value: {
            agentUser: items[currentIndex],
            detail: null,
          },
        };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

function DialerStatusBadge({ status }) {
  const normalizedStatus = String(status || "UNKNOWN").toUpperCase();
  const statusClass =
    normalizedStatus === "INDEAD"
      ? "dead"
      : normalizedStatus === "DISPO"
        ? "dispo"
        : normalizedStatus.toLowerCase();
  const statusLabel =
    normalizedStatus === "INDEAD"
      ? "IN DEAD"
      : normalizedStatus === "DISPO"
        ? "IN DISPO"
        : normalizedStatus;

  return (
    <span
      className={`dialer-status dialer-status--${statusClass}`}
    >
      <span aria-hidden="true" />
      {statusLabel}
    </span>
  );
}

function DialerTimer({ active, elapsedSeconds, type }) {
  const warnThreshold =
    type === "wait"
      ? DIALER_WAIT_WARN_SECONDS
      : type === "pause"
        ? DIALER_PAUSE_WARN_SECONDS
        : DIALER_INCALL_WARN_SECONDS;
  const isWarning =
    active && elapsedSeconds !== null && elapsedSeconds >= warnThreshold;

  return (
    <span
      className={[
        "dialer-timer",
        `dialer-timer--${type}`,
        !active ? "dialer-timer--inactive" : "",
        isWarning ? "dialer-timer--warning" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {active && <span aria-hidden="true" />}
      {active ? formatDuration(elapsedSeconds) : "-"}
    </span>
  );
}

function useDialerLiveState() {
  const [agents, setAgents] = useState([]);
  const [subStatusesByUser, setSubStatusesByUser] = useState({});
  const [subStatusTimerState, setSubStatusTimerState] = useState(() =>
    readDialerSubStatusTimerState(),
  );
  const [timerState, setTimerState] = useState(() => readDialerTimerState());
  const [nowTick, setNowTick] = useState(0);
  const [countdown, setCountdown] = useState(DIALER_REFRESH_SECONDS);
  const [lastUpdated, setLastUpdated] = useState("");
  const [error, setError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const agentsRef = useRef([]);
  const timerStateRef = useRef(timerState);
  const nowTickRef = useRef(0);
  const agentStatusRequestIdRef = useRef(0);
  const isAgentStatusRefreshRunningRef = useRef(false);
  const shouldUseAgentStatusFallbackRef = useRef(false);

  const loadDialerAgents = useCallback(async () => {
    try {
      const parsedAgents = parseDialerCsv(await getDialerAgents());
      setAgents(parsedAgents);
      const refreshedAt = Date.now();
      const nextTimerState = syncDialerTimerState(timerStateRef.current, parsedAgents);

      setTimerState(nextTimerState);
      saveDialerTimerState(nextTimerState);
      setNowTick(refreshedAt);
      setLastUpdated(new Date().toLocaleTimeString("en-IN"));
      setError("");

      agentsRef.current = parsedAgents;
      timerStateRef.current = nextTimerState;
      nowTickRef.current = refreshedAt;

      return {
        agents: parsedAgents,
        timerState: nextTimerState,
        nowTick: refreshedAt,
      };
    } catch (loadError) {
      setError(
        `Dialer upstream unreachable. Check backend ViciDial settings and network. (${loadError.message})`,
      );
      throw loadError;
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (hasLoaded) {
      return undefined;
    }

    const initialLoad = window.setTimeout(() => {
      loadDialerAgents().catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [hasLoaded, loadDialerAgents]);

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  useEffect(() => {
    nowTickRef.current = nowTick || Date.now();
  }, [nowTick]);

  const loadAgentStatusDetails = useCallback(async () => {
    if (isAgentStatusRefreshRunningRef.current) {
      return;
    }

    const agentUsers = [
      ...new Set(
        agentsRef.current
          .map((agent) => String(agent.user || "").trim())
          .filter(Boolean),
      ),
    ];
    const requestId = agentStatusRequestIdRef.current + 1;

    agentStatusRequestIdRef.current = requestId;

    if (agentUsers.length === 0) {
      setSubStatusesByUser({});
      setSubStatusTimerState({});
      saveDialerSubStatusTimerState({});
      return;
    }

    isAgentStatusRefreshRunningRef.current = true;

    try {
      let results;

      if (shouldUseAgentStatusFallbackRef.current) {
        results = await mapWithConcurrency(
          agentUsers,
          DIALER_AGENT_STATUS_FALLBACK_CONCURRENCY,
          async (agentUser) => ({
            agentUser,
            detail: parseDialerAgentStatusCsv(await getDialerAgent(agentUser)),
          }),
        );
      } else {
        try {
          const agentStatusMap = await getDialerAgentStatuses(agentUsers);
          results = agentUsers.map((agentUser) => ({
            status: "fulfilled",
            value: {
              agentUser,
              detail: parseDialerAgentStatusCsv(agentStatusMap?.[agentUser] || ""),
            },
          }));
        } catch (batchError) {
          shouldUseAgentStatusFallbackRef.current = true;
          console.warn(
            "[Dialer Dashboard] Batch agent detail endpoint unavailable; using per-agent fallback.",
            batchError.message,
          );
          results = await mapWithConcurrency(
            agentUsers,
            DIALER_AGENT_STATUS_FALLBACK_CONCURRENCY,
            async (agentUser) => ({
              agentUser,
              detail: parseDialerAgentStatusCsv(await getDialerAgent(agentUser)),
            }),
          );
        }
      }

      if (agentStatusRequestIdRef.current !== requestId) {
        return;
      }

      setSubStatusesByUser(getDialerSubStatusesByUser(results));
      setSubStatusTimerState((currentState) => {
        const nextState = syncDialerSubStatusTimerState(currentState, results);

        saveDialerSubStatusTimerState(nextState);
        return nextState;
      });
    } finally {
      isAgentStatusRefreshRunningRef.current = false;
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
      setCountdown((current) => {
        if (current <= 1) {
          loadAgentStatusDetails().catch((statusError) => {
            console.warn("[Dialer Dashboard] Agent detail refresh failed:", statusError.message);
          });
          loadDialerAgents().catch(() => undefined);
          return DIALER_REFRESH_SECONDS;
        }

        const nextCountdown = current - 1;

        if (nextCountdown % DIALER_AGENT_STATUS_REFRESH_SECONDS === 0) {
          loadAgentStatusDetails().catch((statusError) => {
            console.warn("[Dialer Dashboard] Agent detail refresh failed:", statusError.message);
          });
        }

        return nextCountdown;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loadAgentStatusDetails, loadDialerAgents]);

  const logBestAvailableAgent = useCallback(async (callData) => {
    const campaignId = String(callData.campaignId || "").toUpperCase();
    let currentAgents = agentsRef.current;
    let currentTimerState = timerStateRef.current;
    let currentTick = Date.now();

    if (currentAgents.length === 0) {
      try {
        const fallbackSnapshot = await loadDialerAgents();
        currentAgents = fallbackSnapshot.agents;
        currentTimerState = fallbackSnapshot.timerState;
        currentTick = fallbackSnapshot.nowTick;
        console.warn(
          "[Campaign Webhook] No pre-call dashboard snapshot was available; selected from a fresh snapshot.",
        );
      } catch (refreshError) {
        console.warn(
          "[Campaign Webhook] Could not load dialer agents for selection.",
          refreshError.message,
        );
      }
    }

    const campaignAgentsForCall = currentAgents.filter(
      (agent) => agent.campaignId.toUpperCase() === campaignId,
    );
    const shouldPrioritizeLowCallCount =
      LOW_CALL_COUNT_PRIORITY_CAMPAIGNS.has(campaignId);
    const readyAgents = campaignAgentsForCall
      .filter((agent) => agent.status.toUpperCase() === "READY")
      .map((agent) => {
        const readyMilliseconds =
          getDialerElapsedMs(currentTimerState, agent.user, currentTick) || 0;
        const readySeconds = Math.floor(readyMilliseconds / 1000);

        return {
          ...agent,
          readyMilliseconds,
          readySeconds,
          readyTime: formatDuration(readySeconds),
          readyTimePrecise: `${formatDuration(readySeconds)}.${String(
            readyMilliseconds % 1000,
          ).padStart(3, "0")}`,
        };
      })
      .sort((left, right) => {
        if (shouldPrioritizeLowCallCount && left.callsToday !== right.callsToday) {
          return left.callsToday - right.callsToday;
        }

        if (!shouldPrioritizeLowCallCount && right.readyMilliseconds !== left.readyMilliseconds) {
          return right.readyMilliseconds - left.readyMilliseconds;
        }

        if (shouldPrioritizeLowCallCount && right.readyMilliseconds !== left.readyMilliseconds) {
          return right.readyMilliseconds - left.readyMilliseconds;
        }

        if (!shouldPrioritizeLowCallCount && left.callsToday !== right.callsToday) {
          return left.callsToday - right.callsToday;
        }

        return left.user.localeCompare(right.user, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });

    // console.log(
    //   `[Campaign Webhook] Campaign ${campaignId} received call from ${callData.caller}`,
    //   callData,
    // );

    if (readyAgents.length === 0) {
      // console.log(
      //   `[Campaign Webhook] No READY agent found for campaign ${campaignId}`,
      //   {
      //     call: callData,
      //     campaignAgents: campaignAgentsForCall,
      //   },
      // );
      return;
    }

    const bestAgent = readyAgents[0];

    // console.log(
    //   `[Campaign Webhook] Best available agent for ${campaignId} call ${callData.caller}: ${bestAgent.user} (${bestAgent.fullName}) ready for ${bestAgent.readyTimePrecise}`,
    //   {
    //     call: callData,
    //     bestAgent,
    //     readyAgents,
    //     selectionRule: shouldPrioritizeLowCallCount
    //       ? "READY agents in matching campaign from the pre-call dashboard snapshot, sorted by lowest calls today, then longest dashboard wait milliseconds, then username."
    //       : "READY agents in matching campaign from the pre-call dashboard snapshot, sorted by longest dashboard wait milliseconds, then lowest calls today, then username.",
    //   },
    // );
    // console.table(
    //   readyAgents.map((agent) => ({
    //     user: agent.user,
    //     fullName: agent.fullName,
    //     campaignId: agent.campaignId,
    //     sessionId: agent.sessionId,
    //     status: agent.status,
    //     readyTime: agent.readyTimePrecise,
    //     readyMilliseconds: agent.readyMilliseconds,
    //     callsToday: agent.callsToday,
    //   })),
    // );

    try {
      const agentStatus = parseDialerAgentStatusCsv(await getDialerAgent(bestAgent.user));

      if (agentStatus) {
        // console.log(
        //   `[Campaign Webhook] Selected agent live call detail: ${bestAgent.user} (${bestAgent.fullName})`,
        //   {
        //     agentName: agentStatus.full_name || bestAgent.fullName,
        //     mobileNumber: agentStatus.phone_number || callData.caller,
        //     callerId: agentStatus.callerid,
        //     vendorLeadCode: agentStatus.vendor_lead_code,
        //   },
        // );
      } else {
        console.warn(
          `[Campaign Webhook] No live agent status detail returned for ${bestAgent.user}`,
        );
      }
    } catch (agentStatusError) {
      console.warn(
        `[Campaign Webhook] Could not fetch live call detail for ${bestAgent.user}.`,
        agentStatusError.message,
      );
    }

    loadDialerAgents().catch((refreshError) => {
      console.warn(
        "[Campaign Webhook] Post-selection dashboard refresh failed.",
        refreshError.message,
      );
    });
  }, [loadDialerAgents]);

  useEffect(() => {
    let socket;
    let isMounted = true;

    loadSocketIoClient(WEBHOOK_SOCKET_URL)
      .then((io) => {
        if (!isMounted || !io) {
          return;
        }

        socket = io(WEBHOOK_SOCKET_URL);

        socket.on("connect", () => {
          // console.log("[Campaign Webhook] Connected to observer server", WEBHOOK_SOCKET_URL);
        });

        socket.on("campaign_call_observed", logBestAvailableAgent);

        socket.on("connect_error", (socketError) => {
          console.warn("[Campaign Webhook] Observer connection failed:", socketError.message);
        });
      })
      .catch((socketError) => {
        console.warn("[Campaign Webhook] Socket.IO client could not be loaded:", socketError);
      });

    return () => {
      isMounted = false;
      if (socket) {
        socket.disconnect();
      }
    };
  }, [logBestAvailableAgent]);

  return {
    agents,
    subStatusesByUser,
    subStatusTimerState,
    timerState,
    nowTick,
    countdown,
    lastUpdated,
    error,
  };
}

export function DialerDashboard() {
  const dialerLive = useDialerLiveState();
  const {
    agents,
    subStatusesByUser,
    subStatusTimerState,
    timerState,
    nowTick,
    countdown,
    lastUpdated,
    error,
  } = dialerLive;
  const [activeStatusFilter, setActiveStatusFilter] = useState("ALL");
  const [activeCampaignFilter, setActiveCampaignFilter] = useState("ALL");

  const stats = useMemo(
    () => getDialerStatusCounts(agents, subStatusesByUser),
    [agents, subStatusesByUser],
  );

  const campaignAgents = useMemo(() => {
    if (activeCampaignFilter === "ALL") {
      return agents;
    }

    return agents.filter(
      (agent) => agent.campaignId.toUpperCase() === activeCampaignFilter,
    );
  }, [activeCampaignFilter, agents]);

  const campaignStats = useMemo(
    () => getDialerStatusCounts(campaignAgents, subStatusesByUser),
    [campaignAgents, subStatusesByUser],
  );

  const visibleAgents = useMemo(() => {
    return agents.filter((agent) => {
      const normalizedStatus = getAgentDisplayStatus(agent, subStatusesByUser);
      const statusMatches = (() => {
        if (activeStatusFilter === "ALL") {
          return true;
        }

        if (activeStatusFilter === "INDEAD") {
          return normalizedStatus === "INDEAD";
        }

        if (activeStatusFilter === "DISPO") {
          return normalizedStatus === "DISPO";
        }

        return normalizedStatus === activeStatusFilter;
      })();
      const campaignMatches =
        activeCampaignFilter === "ALL" ||
        agent.campaignId.toUpperCase() === activeCampaignFilter;

      return statusMatches && campaignMatches;
    });
  }, [activeCampaignFilter, activeStatusFilter, agents, subStatusesByUser]);

  const statCards = [
    { key: "total", label: "Total Agents", value: stats.total },
    { key: "ready", label: "Ready", value: stats.ready },
    { key: "paused", label: "Paused", value: stats.paused },
    { key: "incall", label: "In Call", value: stats.incall },
    { key: "dead", label: "In Dead", value: stats.dead },
    { key: "dispo", label: "In Dispo", value: stats.dispo },
  ];
  const campaignStatusBadges = [
    { key: "total", label: "Total", value: campaignStats.total },
    { key: "ready", label: "Ready", value: campaignStats.ready },
    { key: "paused", label: "Paused", value: campaignStats.paused },
    { key: "incall", label: "In Call", value: campaignStats.incall },
    { key: "dead", label: "In Dead", value: campaignStats.dead },
    { key: "dispo", label: "In Dispo", value: campaignStats.dispo },
  ];
  const campaignSummaryLabel =
    activeCampaignFilter === "ALL" ? "All campaigns" : activeCampaignFilter;
  const campaignFilters = ["ALL", ...DIALER_CAMPAIGNS];
  const dialerColumns = [
    {
      key: "fullName",
      label: "Agent",
      render: (agent) => (
        <>
          <strong>{agent.fullName || "-"}</strong>
          <span>{agent.user || "-"}</span>
        </>
      ),
      searchValue: (agent) => `${agent.fullName} ${agent.user}`,
    },
    {
      key: "campaignId",
      label: "Campaign",
      render: (agent) => (
        <span className="dialer-chip">{agent.campaignId || "-"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (agent) => <DialerStatusBadge status={getAgentDisplayStatus(agent, subStatusesByUser)} />,
    },
    { key: "sessionId", label: "Session" },
    {
      key: "callsToday",
      label: "Calls",
      render: (agent) => (
        <span className="dialer-chip dialer-chip--calls">
          {formatNumber(agent.callsToday)}
        </span>
      ),
      sortValue: (agent) => agent.callsToday || 0,
    },
    {
      key: "userLevel",
      label: "Level",
      render: (agent) => <span className="dialer-chip">L{agent.userLevel}</span>,
    },
    {
      key: "waitTime",
      label: "Wait Time",
      render: (agent) => {
        const status = agent.status.toUpperCase();
        return (
          <DialerTimer
            active={status === "READY"}
            elapsedSeconds={getDialerElapsed(timerState, agent.user, nowTick)}
            type="wait"
          />
        );
      },
      searchable: false,
      sortable: false,
    },
    {
      key: "pauseTime",
      label: "Pause Time",
      render: (agent) => {
        const status = agent.status.toUpperCase();
        return (
          <DialerTimer
            active={status === "PAUSED"}
            elapsedSeconds={getDialerElapsed(timerState, agent.user, nowTick)}
            type="pause"
          />
        );
      },
      searchable: false,
      sortable: false,
    },
    {
      key: "incallTime",
      label: "InCall Time",
      render: (agent) => {
        const status = agent.status.toUpperCase();
        return (
          <DialerTimer
            active={status === "INCALL"}
            elapsedSeconds={getDialerElapsed(timerState, agent.user, nowTick)}
            type="incall"
          />
        );
      },
      searchable: false,
      sortable: false,
    },
    {
      key: "wrapDeadTime",
      label: "Wrap/Dead Time",
      render: (agent) => {
        const timer = subStatusTimerState[agent.user];

        return (
          <DialerTimer
            active={timer?.timerType === "wrapDead"}
            elapsedSeconds={getDialerElapsed(subStatusTimerState, agent.user, nowTick)}
            type="pause"
          />
        );
      },
      searchable: false,
      sortable: false,
    },
    {
      key: "dispoTime",
      label: "Dispo Time",
      render: (agent) => {
        const timer = subStatusTimerState[agent.user];

        return (
          <DialerTimer
            active={timer?.timerType === "dispo"}
            elapsedSeconds={getDialerElapsed(subStatusTimerState, agent.user, nowTick)}
            type="wait"
          />
        );
      },
      searchable: false,
      sortable: false,
    },
  ];

  return (
    <div className="dialer-dashboard">
      <section className="admin-card admin-card--wide dialer-monitor">
        <div className="dialer-monitor__header">
          <div>
            <p className="eyebrow">ViciDial live status</p>
            <h2>Agent Live Monitor</h2>
          </div>
          <div className="dialer-monitor__meta">
            <span
              className={
                error
                  ? "dialer-live-badge dialer-live-badge--error"
                  : "dialer-live-badge"
              }
            >
              <span aria-hidden="true" />
              {error ? "Error" : "Live"}
            </span>
            <strong>{countdown}</strong>
            <small>Updated: {lastUpdated || "--:--:--"}</small>
          </div>
        </div>

        {error && <p className="notice notice--error">{error}</p>}

        <section className="dialer-stat-grid">
          {statCards.map((card) => (
            <article className={`dialer-stat dialer-stat--${card.key}`} key={card.key}>
              <span>{card.label}</span>
              <strong>{formatNumber(card.value)}</strong>
            </article>
          ))}
        </section>

        <div className="dialer-filter-bar">
          <div className="dialer-filter-buttons">
            {dialerStatuses.map((status) => (
              <button
                className={
                  activeStatusFilter === status.key
                    ? "dialer-filter-button dialer-filter-button--active"
                    : "dialer-filter-button"
                }
                key={status.key}
                onClick={() => setActiveStatusFilter(status.key)}
                type="button"
              >
                {status.label}
              </button>
            ))}
          </div>
          <div className="dialer-filter-buttons dialer-filter-buttons--campaigns">
            {campaignFilters.map((campaign) => (
              <button
                className={
                  activeCampaignFilter === campaign
                    ? "dialer-filter-button dialer-filter-button--active"
                    : "dialer-filter-button"
                }
                key={campaign}
                onClick={() => setActiveCampaignFilter(campaign)}
                type="button"
              >
                {campaign}
              </button>
            ))}
          </div>
          <span>{formatNumber(visibleAgents.length)} agents</span>
        </div>

        {activeCampaignFilter !== "ALL" && (
          <div className="dialer-table-summary" aria-label="Campaign agent status counts">
            <strong>{campaignSummaryLabel}</strong>
            <div className="dialer-table-summary__badges">
              {campaignStatusBadges.map((badge) => (
                <span
                  className={`dialer-count-badge dialer-count-badge--${badge.key}`}
                  key={badge.key}
                >
                  <span>{badge.label}</span>
                  <strong>{formatNumber(badge.value)}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        <DataTable
          columns={dialerColumns}
          emptyText="No agents match your filter."
          pageSize={10}
          rows={visibleAgents}
          searchPlaceholder="Search dialer agents"
        />
      </section>
    </div>
  );
}
