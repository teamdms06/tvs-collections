import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  exportFeedbackData,
  getAdminDashboard,
  getAdminUsers,
  getAdminUserOptions,
  getDialerAgents,
  getUploadedFiles,
  saveAdminUser,
  updateAdminUserAccess,
  updateUploadedFileAccess,
} from "../api/admin";
import { uploadLeadFile } from "../api/leads";
import { productConfigs } from "../data/formConfigs";

const adminMenu = [
  { key: "dashboard", label: "Dashboard" },
  { key: "upload", label: "Upload Data" },
  { key: "export", label: "Export Data" },
  { key: "users", label: "User Manager" },
];

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function StatusBadge({ status, inactive }) {
  const isInactive = inactive || status === "inactive" || status === false;
  const label = isInactive
    ? "Inactive"
    : status === true
      ? "Active"
      : status || "Active";

  return (
    <span
      className={
        isInactive ? "status-badge status-badge--inactive" : "status-badge"
      }
    >
      {label}
    </span>
  );
}

function Toast({ notice, onClose }) {
  if (!notice) {
    return null;
  }

  return (
    <div className={`toast-notice toast-notice--${notice.type}`} role="alert">
      <div>
        <span>{notice.type}</span>
        <p>{notice.message}</p>
      </div>
      <button aria-label="Dismiss notification" onClick={onClose} type="button">
        x
      </button>
    </div>
  );
}

const emptyUserForm = {
  name: "",
  username: "",
  password: "",
  isActive: true,
  roles: ["agent"],
};

const DIALER_REFRESH_SECONDS = 5;
const DIALER_PAUSE_WARN_SECONDS = 5 * 60;
const DIALER_WAIT_WARN_SECONDS = 3 * 60;
const DIALER_INCALL_WARN_SECONDS = 10 * 60;
const DIALER_TIMER_STORAGE_KEY = "tvsDialerTimerState";
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
const dialerStatuses = ["ALL", "READY", "PAUSED", "INCALL", "CLOSER"];

function getDialerStatusCounts(agents) {
  const counts = {
    total: agents.length,
    ready: 0,
    paused: 0,
    incall: 0,
    closer: 0,
    other: 0,
  };

  for (const agent of agents) {
    const status = agent.status.toUpperCase();
    if (status === "READY") {
      counts.ready += 1;
    } else if (status === "PAUSED") {
      counts.paused += 1;
    } else if (status === "INCALL") {
      counts.incall += 1;
    } else if (status === "CLOSER") {
      counts.closer += 1;
    } else {
      counts.other += 1;
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

function syncDialerTimerState(currentState, agents) {
  const now = Date.now();
  const nextState = {};

  for (const agent of agents) {
    const key = agent.user;
    const status = agent.status.toUpperCase();
    const sessionId = agent.sessionId || "";
    const previous = currentState[key];
    const isTimedStatus =
      status === "READY" || status === "PAUSED" || status === "INCALL";

    if (previous?.status === status && previous?.sessionId === sessionId) {
      nextState[key] = previous;
    } else {
      nextState[key] = {
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
          typeof timer.sessionId === "string" &&
          typeof timer.status === "string" &&
          (typeof timer.startedAt === "number" || timer.startedAt === null),
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

function DialerStatusBadge({ status }) {
  const normalizedStatus = String(status || "UNKNOWN").toUpperCase();

  return (
    <span
      className={`dialer-status dialer-status--${normalizedStatus.toLowerCase()}`}
    >
      <span aria-hidden="true" />
      {normalizedStatus}
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
  const [timerState, setTimerState] = useState({});
  const [nowTick, setNowTick] = useState(0);
  const [countdown, setCountdown] = useState(DIALER_REFRESH_SECONDS);
  const [lastUpdated, setLastUpdated] = useState("");
  const [error, setError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const agentsRef = useRef([]);
  const timerStateRef = useRef({});
  const nowTickRef = useRef(0);

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

    const storedTimerState = readDialerTimerState();
    timerStateRef.current = storedTimerState;

    const initialLoad = window.setTimeout(() => {
      loadDialerAgents().catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [hasLoaded, loadDialerAgents]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
      setCountdown((current) => {
        if (current <= 1) {
          loadDialerAgents().catch(() => undefined);
          return DIALER_REFRESH_SECONDS;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loadDialerAgents]);

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  useEffect(() => {
    nowTickRef.current = nowTick || Date.now();
  }, [nowTick]);

  const logBestAvailableAgent = useCallback(async (callData) => {
    let latestSnapshot = null;

    try {
      latestSnapshot = await loadDialerAgents();
    } catch (refreshError) {
      console.warn(
        "[Campaign Webhook] Could not refresh dialer agents before selection; using current dashboard snapshot.",
        refreshError.message,
      );
    }

    const campaignId = String(callData.campaignId || "").toUpperCase();
    const currentAgents = latestSnapshot?.agents || agentsRef.current;
    const currentTimerState = latestSnapshot?.timerState || timerStateRef.current;
    const currentTick = latestSnapshot?.nowTick || nowTickRef.current || Date.now();
    const campaignAgentsForCall = currentAgents.filter(
      (agent) => agent.campaignId.toUpperCase() === campaignId,
    );
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
        if (right.readyMilliseconds !== left.readyMilliseconds) {
          return right.readyMilliseconds - left.readyMilliseconds;
        }

        return left.user.localeCompare(right.user, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });

    console.log(
      `[Campaign Webhook] Campaign ${campaignId} received call from ${callData.caller}`,
      callData,
    );

    if (readyAgents.length === 0) {
      console.log(
        `[Campaign Webhook] No READY agent found for campaign ${campaignId}`,
        {
          call: callData,
          campaignAgents: campaignAgentsForCall,
        },
      );
      return;
    }

    const bestAgent = readyAgents[0];

    console.log(
      `[Campaign Webhook] Best available agent for ${campaignId} call ${callData.caller}: ${bestAgent.user} (${bestAgent.fullName}) ready for ${bestAgent.readyTimePrecise}`,
      {
        call: callData,
        bestAgent,
        readyAgents,
      },
    );
    console.table(
      readyAgents.map((agent) => ({
        user: agent.user,
        fullName: agent.fullName,
        campaignId: agent.campaignId,
        status: agent.status,
        readyTime: agent.readyTimePrecise,
        readyMilliseconds: agent.readyMilliseconds,
        callsToday: agent.callsToday,
      })),
    );
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
          console.log("[Campaign Webhook] Connected to observer server", WEBHOOK_SOCKET_URL);
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
    timerState,
    nowTick,
    countdown,
    lastUpdated,
    error,
  };
}

function DialerDashboard({ dialerLive }) {
  const {
    agents,
    timerState,
    nowTick,
    countdown,
    lastUpdated,
    error,
  } = dialerLive;
  const [activeStatusFilter, setActiveStatusFilter] = useState("ALL");
  const [activeCampaignFilter, setActiveCampaignFilter] = useState("ALL");

  const stats = useMemo(() => getDialerStatusCounts(agents), [agents]);

  const campaignAgents = useMemo(() => {
    if (activeCampaignFilter === "ALL") {
      return agents;
    }

    return agents.filter(
      (agent) => agent.campaignId.toUpperCase() === activeCampaignFilter,
    );
  }, [activeCampaignFilter, agents]);

  const campaignStats = useMemo(
    () => getDialerStatusCounts(campaignAgents),
    [campaignAgents],
  );

  const visibleAgents = useMemo(() => {
    return agents.filter((agent) => {
      const statusMatches =
        activeStatusFilter === "ALL" ||
        agent.status.toUpperCase() === activeStatusFilter;
      const campaignMatches =
        activeCampaignFilter === "ALL" ||
        agent.campaignId.toUpperCase() === activeCampaignFilter;

      return statusMatches && campaignMatches;
    });
  }, [activeCampaignFilter, activeStatusFilter, agents]);

  const statCards = [
    { key: "total", label: "Total Agents", value: stats.total },
    { key: "ready", label: "Ready", value: stats.ready },
    { key: "paused", label: "Paused", value: stats.paused },
    { key: "incall", label: "In Call", value: stats.incall },
    { key: "closer", label: "Closer", value: stats.closer },
    { key: "other", label: "Other", value: stats.other },
  ];
  const campaignStatusBadges = [
    { key: "total", label: "Total", value: campaignStats.total },
    { key: "ready", label: "Ready", value: campaignStats.ready },
    { key: "paused", label: "Paused", value: campaignStats.paused },
    { key: "incall", label: "In Call", value: campaignStats.incall },
    { key: "closer", label: "Closer", value: campaignStats.closer },
    { key: "other", label: "Other", value: campaignStats.other },
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
      render: (agent) => <DialerStatusBadge status={agent.status} />,
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
                  activeStatusFilter === status
                    ? "dialer-filter-button dialer-filter-button--active"
                    : "dialer-filter-button"
                }
                key={status}
                onClick={() => setActiveStatusFilter(status)}
                type="button"
              >
                {status === "INCALL" ? "In Call" : status}
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

function DataTable({
  columns,
  rows,
  emptyText = "No records found.",
  pageSize = 10,
  searchPlaceholder = "Search table",
}) {
  const [searchText, setSearchText] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [page, setPage] = useState(1);

  const normalizedSearchText = searchText.trim().toLowerCase();

  const processedRows = useMemo(() => {
    const filteredRows = normalizedSearchText
      ? rows.filter((row) =>
          columns.some((column) => {
            if (column.searchable === false) {
              return false;
            }

            const value = column.searchValue
              ? column.searchValue(row)
              : row[column.key];

            return String(value ?? "")
              .toLowerCase()
              .includes(normalizedSearchText);
          }),
        )
      : rows;

    if (!sortConfig.key) {
      return filteredRows;
    }

    const sortColumn = columns.find((column) => column.key === sortConfig.key);
    if (!sortColumn) {
      return filteredRows;
    }

    return [...filteredRows].sort((left, right) => {
      const leftValue = sortColumn.sortValue
        ? sortColumn.sortValue(left)
        : left[sortColumn.key];
      const rightValue = sortColumn.sortValue
        ? sortColumn.sortValue(right)
        : right[sortColumn.key];
      const comparison = String(leftValue ?? "").localeCompare(
        String(rightValue ?? ""),
        undefined,
        { numeric: true, sensitivity: "base" },
      );

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [columns, normalizedSearchText, rows, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(processedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = processedRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const changeSort = (column) => {
    if (column.sortable === false) {
      return;
    }

    setSortConfig((current) => ({
      key: column.key,
      direction:
        current.key === column.key && current.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const updateSearchText = (value) => {
    setSearchText(value);
    setPage(1);
  };

  return (
    <div className="data-table">
      <div className="data-table__toolbar">
        <input
          aria-label={searchPlaceholder}
          onChange={(event) => updateSearchText(event.target.value)}
          placeholder={searchPlaceholder}
          value={searchText}
        />
        <span>
          {formatNumber(processedRows.length)} / {formatNumber(rows.length)}
        </span>
      </div>

      <div className="data-table__scroll">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  <button
                    disabled={column.sortable === false}
                    onClick={() => changeSort(column)}
                    type="button"
                  >
                    <span>{column.label}</span>
                    {sortConfig.key === column.key && (
                      <b>{sortConfig.direction === "asc" ? "Asc" : "Desc"}</b>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={columns.length}>{emptyText}</td>
              </tr>
            )}
            {visibleRows.map((row, rowIndex) => (
              <tr key={row.id || row.username || row.fileName || rowIndex}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render
                      ? column.render(row)
                      : String(row[column.key] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {processedRows.length > pageSize && (
        <div className="data-table__pagination">
          <button
            className="secondary-action"
            disabled={currentPage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="secondary-action"
            disabled={currentPage === totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function AdminContent({ activeMenu, user, notify }) {
  const accessibleProducts =
    user.accessProducts && user.accessProducts.length > 0
      ? user.accessProducts
      : Object.keys(productConfigs);
  const defaultProduct = accessibleProducts.includes("retail")
    ? "retail"
    : accessibleProducts[0] || "retail";
  const [selectedProduct, setSelectedProduct] = useState(defaultProduct);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [activeDashboardTab, setActiveDashboardTab] = useState("crm");
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadsError, setUploadsError] = useState("");
  const [updatingUploadId, setUpdatingUploadId] = useState(null);
  const [users, setUsers] = useState([]);
  const [userOptions, setUserOptions] = useState({ roles: [], products: [] });
  const [usersError, setUsersError] = useState("");
  const [userFormMode, setUserFormMode] = useState("closed");
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [savingUser, setSavingUser] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [, setExportError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const dialerLive = useDialerLiveState();

  useEffect(() => {
    let isActive = true;

    const loadDashboard = async () => {
      setDashboardLoading(true);
      setDashboardError("");

      try {
        const data = await getAdminDashboard();
        if (isActive) {
          setDashboard(data);
        }
      } catch (error) {
        if (isActive) {
          setDashboardError(error.message || "Could not load dashboard data.");
        }
      } finally {
        if (isActive) {
          setDashboardLoading(false);
        }
      }
    };

    loadDashboard();
    const interval = window.setInterval(loadDashboard, 30000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [refreshKey]);

  useEffect(() => {
    let isActive = true;

    const loadUsers = async () => {
      setUsersError("");

      try {
        const [usersData, optionsData] = await Promise.all([
          getAdminUsers(),
          getAdminUserOptions(),
        ]);

        if (isActive) {
          setUsers(Array.isArray(usersData) ? usersData : []);
          setUserOptions({
            roles: Array.isArray(optionsData?.roles) ? optionsData.roles : [],
            products: Array.isArray(optionsData?.products)
              ? optionsData.products
              : [],
          });
        }
      } catch (error) {
        if (isActive) {
          setUsersError(error.message || "Could not load users.");
        }
      }
    };

    loadUsers();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    let isActive = true;

    const loadUploadedFiles = async () => {
      setUploadsError("");

      try {
        const data = await getUploadedFiles();
        if (isActive) {
          setUploadedFiles(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (isActive) {
          setUploadsError(error.message || "Could not load uploaded files.");
        }
      }
    };

    loadUploadedFiles();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  const statCards = useMemo(
    () => [
      {
        label: "Uploaded files",
        value: formatNumber(dashboard?.uploadedFiles),
      },
      { label: "Total leads", value: formatNumber(dashboard?.totalLeads) },
      {
        label: "Feedback today",
        value: formatNumber(dashboard?.feedbackToday),
      },
      { label: "Active users", value: formatNumber(dashboard?.activeUsers) },
      {
        label: "Total feedback",
        value: formatNumber(dashboard?.totalFeedback),
      },
      {
        label: "Users enabled",
        value: `${formatNumber(dashboard?.enabledUsers)} / ${formatNumber(dashboard?.totalUsers)}`,
      },
      { label: "Uploads today", value: formatNumber(dashboard?.uploadedToday) },
      {
        label: "Last refresh",
        value: dashboard?.generatedAt
          ? formatDateTime(dashboard.generatedAt)
          : "-",
      },
    ],
    [dashboard],
  );

  const handleUpload = async (event) => {
    event.preventDefault();
    const uploadForm = event.currentTarget;

    if (!selectedFile) {
      notify("Please select an Excel file.", "warning");
      setUploadError("Please select an Excel file.");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadResult(null);
    notify("Uploading file. Please wait.", "info");

    try {
      const result = await uploadLeadFile(selectedFile, selectedProduct);
      setUploadResult(result);
      setSelectedFile(null);
      setRefreshKey((current) => current + 1);
      uploadForm.reset();
      notify("Data uploaded successfully.", "success");
    } catch (error) {
      const message = error.message || "Upload failed.";
      setUploadError(message);
      notify(message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const changeUploadAccess = async (uploadId, isActive) => {
    setUpdatingUploadId(uploadId);
    setUploadsError("");

    try {
      const updatedUpload = await updateUploadedFileAccess(uploadId, isActive);
      setUploadedFiles((current) =>
        current.map((upload) =>
          upload.id === uploadId ? updatedUpload : upload,
        ),
      );
      setRefreshKey((current) => current + 1);
      notify(
        isActive ? "Uploaded file activated." : "Uploaded file deactivated.",
        "success",
      );
    } catch (error) {
      const message = error.message || "Could not update uploaded file access.";
      setUploadsError(message);
      notify(message, "error");
    } finally {
      setUpdatingUploadId(null);
    }
  };

  const openAddUserForm = () => {
    setUserFormMode("add");
    setEditingUserId(null);
    setUserForm({
      ...emptyUserForm,
      roles: userOptions.roles.includes("agent")
        ? ["agent"]
        : [userOptions.roles[0] || "agent"],
    });
    setUsersError("");
  };

  const openEditUserForm = (selectedUser) => {
    setUserFormMode("edit");
    setEditingUserId(selectedUser.id);
    setUserForm({
      name: selectedUser.name || "",
      username: selectedUser.username || "",
      password: "",
      isActive: selectedUser.isActive !== false,
      roles: selectedUser.roles?.length ? selectedUser.roles : ["agent"],
    });
    setUsersError("");
  };

  const closeUserForm = () => {
    setUserFormMode("closed");
    setEditingUserId(null);
    setUserForm(emptyUserForm);
  };

  const updateUserForm = (field, value) => {
    setUserForm((current) => ({ ...current, [field]: value }));
  };

  const submitUserForm = async (event) => {
    event.preventDefault();
    setSavingUser(true);
    setUsersError("");

    try {
      const payload = {
        name: userForm.name,
        username: userForm.username,
        password: userForm.password.trim(),
        isActive: userForm.isActive,
        roles: userForm.roles.filter(Boolean),
      };
      const savedUser = await saveAdminUser(
        payload,
        userFormMode === "edit" ? editingUserId : null,
      );

      setUsers((current) => {
        if (userFormMode === "edit") {
          return current.map((item) =>
            item.id === savedUser.id ? savedUser : item,
          );
        }

        return [savedUser, ...current];
      });
      closeUserForm();
      setRefreshKey((current) => current + 1);
      notify(
        userFormMode === "edit"
          ? "User updated successfully."
          : "User created successfully.",
        "success",
      );
    } catch (error) {
      const message = error.message || "Could not save user.";
      setUsersError(message);
      notify(message, "error");
    } finally {
      setSavingUser(false);
    }
  };

  const changeUserAccess = async (userId, isActive) => {
    setUpdatingUserId(userId);
    setUsersError("");

    try {
      const updatedUser = await updateAdminUserAccess(userId, isActive);
      setUsers((current) =>
        current.map((item) => (item.id === userId ? updatedUser : item)),
      );
      setRefreshKey((current) => current + 1);
      notify(
        isActive ? "User activated successfully." : "User deactivated successfully.",
        "success",
      );
    } catch (error) {
      const message = error.message || "Could not update user status.";
      setUsersError(message);
      notify(message, "error");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleExport = async (event) => {
    event.preventDefault();

    if (!exportStartDate || !exportEndDate) {
      notify("Select both start date and end date.", "warning");
      setExportError("Select both start date and end date.");
      return;
    }

    if (exportEndDate < exportStartDate) {
      notify("End date must be after start date.", "warning");
      setExportError("End date must be after start date.");
      return;
    }

    setIsExporting(true);
    setExportError("");
    notify("Preparing feedback Excel.", "info");

    try {
      const { blob, fileName } = await exportFeedbackData(
        exportStartDate,
        exportEndDate,
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notify("Feedback Excel exported successfully.", "success");
    } catch (error) {
      const message = error.message || "Could not export feedback data.";
      setExportError(message);
      notify(message, "error");
    } finally {
      setIsExporting(false);
    }
  };

  if (activeMenu === "dashboard") {
    return (
      <div className="admin-dashboard-stack">
        <div className="admin-dashboard-tabs" role="tablist" aria-label="Admin dashboard views">
          <button
            aria-selected={activeDashboardTab === "crm"}
            className={
              activeDashboardTab === "crm"
                ? "admin-dashboard-tab admin-dashboard-tab--active"
                : "admin-dashboard-tab"
            }
            onClick={() => setActiveDashboardTab("crm")}
            role="tab"
            type="button"
          >
            CRM-Dashboard
          </button>
          <button
            aria-selected={activeDashboardTab === "dialer"}
            className={
              activeDashboardTab === "dialer"
                ? "admin-dashboard-tab admin-dashboard-tab--active"
                : "admin-dashboard-tab"
            }
            onClick={() => setActiveDashboardTab("dialer")}
            role="tab"
            type="button"
          >
            Dialer-Dashboard
          </button>
        </div>

        {dashboardError && (
          <p className="notice notice--error">{dashboardError}</p>
        )}
        {dashboardLoading && !dashboard && (
          <p className="notice">Loading live dashboard data...</p>
        )}

        <div
          className="admin-dashboard-tab-panel"
          hidden={activeDashboardTab !== "crm"}
        >
            <section className="admin-grid">
              {statCards.map((card) => (
                <article className="admin-card" key={card.label}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </article>
              ))}
            </section>

            <section className="admin-dashboard-panels">
              <article className="admin-card admin-card--wide">
                <h2>Product Lead Counts</h2>
                <DataTable
                  columns={[
                    {
                      key: "productName",
                      label: "Product",
                      render: (product) => <strong>{product.productName || "-"}</strong>,
                    },
                    { key: "productCode", label: "Code" },
                    {
                      key: "leads",
                      label: "Leads",
                      render: (product) => formatNumber(product.leads),
                      sortValue: (product) => product.leads || 0,
                    },
                  ]}
                  emptyText="No product lead counts found."
                  pageSize={5}
                  rows={dashboard?.productCounts || []}
                  searchPlaceholder="Search products"
                />
              </article>

              <article className="admin-card admin-card--wide">
                <h2>Active User Sessions</h2>
                <DataTable
                  columns={[
                    {
                      key: "username",
                      label: "User",
                      render: (session) => <strong>{session.username}</strong>,
                    },
                    {
                      key: "lastSeenAt",
                      label: "Last seen",
                      render: (session) => formatDateTime(session.lastSeenAt),
                      sortValue: (session) => session.lastSeenAt || "",
                    },
                  ]}
                  emptyText="No active user sessions found."
                  pageSize={5}
                  rows={dashboard?.activeUserSessions || []}
                  searchPlaceholder="Search sessions"
                />
              </article>
            </section>

            <section className="admin-card admin-card--wide">
              <h2>Recent Uploads</h2>
              <DataTable
                columns={[
                  {
                    key: "fileName",
                    label: "File",
                    render: (upload) => <strong>{upload.fileName}</strong>,
                  },
                  {
                    key: "productName",
                    label: "Product",
                    render: (upload) => upload.productName || upload.productCode || "-",
                  },
                  {
                    key: "validRecords",
                    label: "Saved",
                    render: (upload) =>
                      `${formatNumber(upload.validRecords)} / ${formatNumber(upload.totalRecords)}`,
                    sortValue: (upload) => upload.validRecords || 0,
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (upload) => (
                      <StatusBadge
                        status={upload.status || "-"}
                        inactive={upload.status === "inactive"}
                      />
                    ),
                  },
                  {
                    key: "uploadedAt",
                    label: "Uploaded",
                    render: (upload) => formatDateTime(upload.uploadedAt),
                    sortValue: (upload) => upload.uploadedAt || "",
                  },
                ]}
                emptyText="No recent uploads found."
                pageSize={5}
                rows={dashboard?.recentUploads || []}
                searchPlaceholder="Search uploads"
              />
            </section>
        </div>

        <div
          className="admin-dashboard-tab-panel"
          hidden={activeDashboardTab !== "dialer"}
        >
          <DialerDashboard dialerLive={dialerLive} />
        </div>
      </div>
    );
  }

  if (activeMenu === "upload") {
    return (
      <div className="admin-dashboard-stack">
        <section className="admin-card admin-card--wide">
          <h2>Upload Data</h2>
          <form className="admin-upload-form" onSubmit={handleUpload}>
            <label className="form-field">
              <span>Product</span>
              <select
                value={selectedProduct}
                onChange={(event) => setSelectedProduct(event.target.value)}
              >
                {accessibleProducts.map((productKey) => (
                  <option key={productKey} value={productKey}>
                    {productConfigs[productKey]?.label || productKey}
                  </option>
                ))}
              </select>
            </label>

            <label className="upload-box upload-box--admin">
              <span>Upload lead data</span>
              <input
                accept=".xlsx,.xls"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] || null);
                  setUploadError("");
                  setUploadResult(null);
                }}
                type="file"
              />
              <strong>
                {selectedFile
                  ? selectedFile.name
                  : "Excel file with Retail format columns"}
              </strong>
            </label>

            <button
              className="primary-action"
              disabled={isUploading}
              type="submit"
            >
              {isUploading ? "Uploading..." : "Upload to Database"}
            </button>

            {uploadResult && (
              <div className="upload-summary">
                <span>Upload completed</span>
                <strong>{uploadResult.validRecords} records saved</strong>
                <p>
                  File ID {uploadResult.uploadFileId} - Total{" "}
                  {uploadResult.totalRecords} - Failed{" "}
                  {uploadResult.failedRecords}
                </p>
              </div>
            )}
          </form>
        </section>

        <section className="admin-card admin-card--wide">
          <h2>Previously Uploaded Files</h2>
          {uploadsError && (
            <p className="notice notice--error">{uploadsError}</p>
          )}
          <DataTable
            columns={[
              {
                key: "fileName",
                label: "File",
                render: (upload) => <strong>{upload.fileName}</strong>,
              },
              {
                key: "productName",
                label: "Product",
                render: (upload) => upload.productName || upload.productCode || "-",
              },
              {
                key: "validRecords",
                label: "Records",
                render: (upload) =>
                  `${formatNumber(upload.validRecords)} / ${formatNumber(upload.totalRecords)}`,
                sortValue: (upload) => upload.validRecords || 0,
              },
              {
                key: "status",
                label: "Status",
                render: (upload) => (
                  <StatusBadge
                    status={upload.status || "-"}
                    inactive={upload.status === "inactive"}
                  />
                ),
              },
              {
                key: "uploadedAt",
                label: "Uploaded",
                render: (upload) => formatDateTime(upload.uploadedAt),
                sortValue: (upload) => upload.uploadedAt || "",
              },
              {
                key: "action",
                label: "Action",
                searchable: false,
                sortable: false,
                render: (upload) => {
                  const isInactive = upload.status === "inactive";
                  const isUpdating = updatingUploadId === upload.id;

                  return (
                    <button
                      className={
                        isInactive ? "secondary-action" : "danger-action"
                      }
                      disabled={isUpdating}
                      onClick={() => changeUploadAccess(upload.id, isInactive)}
                      type="button"
                    >
                      {isUpdating
                        ? "Updating..."
                        : isInactive
                          ? "Activate"
                          : "Deactivate"}
                    </button>
                  );
                },
              },
            ]}
            emptyText="No uploaded files found."
            rows={uploadedFiles}
            searchPlaceholder="Search uploaded files"
          />
        </section>
      </div>
    );
  }

  if (activeMenu === "export") {
    return (
      <section className="admin-card admin-card--wide">
        <h2>Export Data</h2>
        <form className="admin-export-form" onSubmit={handleExport}>
          <label className="form-field">
            <span>Start date</span>
            <input
              onChange={(event) => {
                setExportStartDate(event.target.value);
                setExportError("");
              }}
              required
              type="date"
              value={exportStartDate}
            />
          </label>
          <label className="form-field">
            <span>End date</span>
            <input
              onChange={(event) => {
                setExportEndDate(event.target.value);
                setExportError("");
              }}
              required
              type="date"
              value={exportEndDate}
            />
          </label>
          <button
            className="primary-action"
            disabled={isExporting}
            type="submit"
          >
            {isExporting ? "Exporting..." : "Export Feedback Excel"}
          </button>
        </form>
      </section>
    );
  }

  if (activeMenu === "users") {
    return (
      <div className="admin-dashboard-stack">
        <section className="admin-card admin-card--wide">
          <div className="admin-section-heading">
            <h2>User Manager</h2>
            <button
              className="primary-action"
              onClick={openAddUserForm}
              type="button"
            >
              Add New User
            </button>
          </div>

          {usersError && <p className="notice notice--error">{usersError}</p>}

          {userFormMode !== "closed" && (
            <form className="admin-user-form" onSubmit={submitUserForm}>
              <label className="form-field">
                <span>Name</span>
                <input
                  onChange={(event) =>
                    updateUserForm("name", event.target.value)
                  }
                  required
                  value={userForm.name}
                />
              </label>
              <label className="form-field">
                <span>Username</span>
                <input
                  onChange={(event) =>
                    updateUserForm("username", event.target.value)
                  }
                  required
                  value={userForm.username}
                />
              </label>
              <label className="form-field">
                <span>
                  {userFormMode === "edit" ? "New Password" : "Password"}
                </span>
                <input
                  onChange={(event) =>
                    updateUserForm("password", event.target.value)
                  }
                  placeholder={
                    userFormMode === "edit"
                      ? "Leave blank to keep current password"
                      : ""
                  }
                  required={userFormMode === "add"}
                  type="password"
                  value={userForm.password}
                />
              </label>
              <label className="form-field">
                <span>Role</span>
                <select
                  onChange={(event) =>
                    updateUserForm("roles", [event.target.value])
                  }
                  required
                  value={userForm.roles[0] || ""}
                >
                  <option value="">Select role</option>
                  {(userOptions.roles.length
                    ? userOptions.roles
                    : ["admin", "agent"]
                  ).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Status</span>
                <select
                  onChange={(event) =>
                    updateUserForm("isActive", event.target.value === "active")
                  }
                  value={userForm.isActive ? "active" : "inactive"}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <div className="form-actions admin-user-form-actions">
                <button
                  className="secondary-action"
                  onClick={closeUserForm}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="primary-action"
                  disabled={savingUser}
                  type="submit"
                >
                  {savingUser
                    ? "Saving..."
                    : userFormMode === "edit"
                      ? "Update User"
                      : "Create User"}
                </button>
              </div>
            </form>
          )}

          <DataTable
            columns={[
              {
                key: "name",
                label: "Name",
                render: (managedUser) => <strong>{managedUser.name || "-"}</strong>,
              },
              { key: "username", label: "Username" },
              {
                key: "roles",
                label: "Role",
                render: (managedUser) => managedUser.roles?.join(", ") || "-",
                searchValue: (managedUser) => managedUser.roles?.join(" ") || "",
              },
              {
                key: "accessProducts",
                label: "Access",
                render: (managedUser) =>
                  managedUser.accessProducts?.join(", ") || "-",
                searchValue: (managedUser) =>
                  managedUser.accessProducts?.join(" ") || "",
              },
              {
                key: "isActive",
                label: "Status",
                render: (managedUser) => (
                  <StatusBadge
                    status={managedUser.isActive !== false}
                    inactive={managedUser.isActive === false}
                  />
                ),
                sortValue: (managedUser) =>
                  managedUser.isActive === false ? "inactive" : "active",
              },
              {
                key: "action",
                label: "Action",
                searchable: false,
                sortable: false,
                render: (managedUser) => {
                  const isActiveUser = managedUser.isActive !== false;
                  const isUpdating = updatingUserId === managedUser.id;

                  return (
                    <span className="admin-row-actions">
                      <button
                        className="secondary-action"
                        onClick={() => openEditUserForm(managedUser)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className={
                          isActiveUser ? "danger-action" : "secondary-action"
                        }
                        disabled={isUpdating}
                        onClick={() =>
                          changeUserAccess(managedUser.id, !isActiveUser)
                        }
                        type="button"
                      >
                        {isUpdating
                          ? "Updating..."
                          : isActiveUser
                            ? "Deactivate"
                            : "Activate"}
                      </button>
                    </span>
                  );
                },
              },
            ]}
            emptyText="No users found."
            rows={users}
            searchPlaceholder="Search users"
          />
        </section>
      </div>
    );
  }
}

export default function AdminPage({ onLogout, user }) {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [notice, setNotice] = useState(null);

  const notify = (message, type = "info") => {
    setNotice({ message, type });
  };

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <main className="workspace-shell admin-workspace">
      <Toast notice={notice} onClose={() => setNotice(null)} />
      <section className="admin-shell">
        <aside className="admin-sidebar" aria-label="Admin menu">
          <div className="admin-brand">
            <span aria-hidden="true">TVS</span>
            <div>
              <strong>Collections Desk</strong>
              <small>Admin Portal</small>
            </div>
          </div>

          <nav className="admin-menu">
            {adminMenu.map((item) => (
              <button
                className={
                  item.key === activeMenu
                    ? "admin-menu-item admin-menu-item--active"
                    : "admin-menu-item"
                }
                key={item.key}
                onClick={() => setActiveMenu(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="admin-sidebar-footer">
            <strong>{user.name}</strong>
            <span>{user.roles?.join(", ") || "Administrator"}</span>
            <button
              className="secondary-action"
              onClick={onLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </aside>

        <div className="admin-content">
          <header className="admin-content-header">
            <div>
              <p className="eyebrow">Admin workspace</p>
              <h1>
                {adminMenu.find((item) => item.key === activeMenu)?.label ||
                  "Dashboard"}
              </h1>
            </div>
            <span>{user.name}</span>
          </header>
          <AdminContent activeMenu={activeMenu} notify={notify} user={user} />
        </div>
      </section>
    </main>
  );
}
