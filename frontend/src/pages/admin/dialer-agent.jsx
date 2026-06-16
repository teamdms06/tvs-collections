import { useCallback, useEffect, useMemo, useState } from "react";
import { getAdminUsers, getDialerAgentStats } from "../../api/admin";
import { DataTable } from "./shared";
import { formatNumber } from "./utils";

function getDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const DEFAULT_REPORT_DATE = getDateInputValue(new Date());
const AGENT_STATS_REFRESH_MS = 60 * 1000;

const agentStatsFields = [
  "user",
  "fullName",
  "userGroup",
  "calls",
  "loginTime",
  "totalTalkTime",
  "avgTalkTime",
  "avgWaitTime",
  "pctOfQueue",
  "pauseTime",
  "sessions",
  "avgSession",
  "pauses",
  "avgPauseTime",
  "pausePct",
  "pausesPerSession",
  "waitTime",
  "talkTime",
  "dispoTime",
  "deadTime",
];

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseDurationMinutes(value) {
  return Math.floor(parseDurationSeconds(value) / 60);
}

function parseDurationSeconds(value) {
  const text = String(value || "").trim();

  if (!text) {
    return 0;
  }

  if (!text.includes(":")) {
    return Number.parseInt(text, 10) || 0;
  }

  const parts = String(value || "")
    .trim()
    .split(":")
    .map((part) => Number.parseInt(part, 10));

  if (
    (parts.length !== 2 && parts.length !== 3) ||
    parts.some((part) => Number.isNaN(part))
  ) {
    return 0;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  // The ViciDial stats endpoint is requested with time_format=M, so A:B means minutes:seconds.
  return parts[0] * 60 + parts[1];
}

function formatDurationClock(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parsePercent(value) {
  return Number.parseFloat(String(value || "").replace("%", "")) || 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadHtmlExcel(fileName, title, tables) {
  const content = tables
    .map(
      (table) => `
      <h2>${escapeHtml(table.title)}</h2>
      <table border="1" cellspacing="0" cellpadding="4">
        <thead>
          <tr>
            ${table.columns.map((column) => `<th style="${column.style || ""}">${escapeHtml(column.label)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${table.rows
            .map(
              (row) => `
              <tr>
                ${table.columns
                  .map((column) => {
                    const value = column.value
                      ? column.value(row)
                      : row[column.key];
                    const style = column.cellStyle ? column.cellStyle(row) : "";

                    return `<td style="${style}">${escapeHtml(value)}</td>`;
                  })
                  .join("")}
              </tr>
            `,
            )
            .join("")}
        </tbody>
      </table>
    `,
    )
    .join("<br />");
  const workbook = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
          th { background: #0070c0; color: #ffffff; font-weight: 700; text-align: center; }
          td { text-align: center; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        ${content}
      </body>
    </html>
  `;
  const blob = new Blob([workbook], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

function getHeatClass(value, values, reverse = false) {
  const numericValues = values.filter((item) => Number.isFinite(item));
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);

  if (!numericValues.length || min === max) {
    return "apr-heat--mid";
  }

  const ratio = (value - min) / (max - min);
  const score = reverse ? 1 - ratio : ratio;

  if (score >= 0.67) {
    return "apr-heat--good";
  }

  if (score >= 0.34) {
    return "apr-heat--mid";
  }

  return "apr-heat--bad";
}

function getHeatStyle(heatClass) {
  if (heatClass === "apr-heat--good") {
    return "background:#63be7b;color:#0d1b2a;font-weight:700;";
  }

  if (heatClass === "apr-heat--bad") {
    return "background:#f8696b;color:#0d1b2a;font-weight:700;";
  }

  return "background:#ffeb84;color:#0d1b2a;font-weight:700;";
}

function isAgentStatsErrorRow(row) {
  return agentStatsFields.some((field) =>
    String(row[field] || "")
      .trim()
      .toUpperCase()
      .startsWith("ERROR:"),
  );
}

function parseAgentStatsExport(text) {
  const rows = String(text || "")
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts.some(Boolean));

  if (rows.length === 0) {
    return [];
  }

  const firstRowHeaders = rows[0].map(normalizeHeader);
  const hasHeader =
    firstRowHeaders.includes("user") && firstRowHeaders.includes("full_name");
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows
    .filter(
      (parts) => parts.length >= 4 && normalizeHeader(parts[0]) !== "user",
    )
    .map((parts, rowIndex) => {
      const row = agentStatsFields.reduce((stats, field, index) => {
        stats[field] = parts[index] || "";
        return stats;
      }, {});
      const isError = isAgentStatsErrorRow(row);

      return {
        ...row,
        id: `${row.user || "agent"}-${rowIndex}`,
        isError,
        errorMessage: isError
          ? agentStatsFields
              .map((field) => row[field])
              .find((value) =>
                String(value || "")
                  .trim()
                  .toUpperCase()
                  .startsWith("ERROR:"),
              ) || ""
          : "",
        calls: Number.parseInt(row.calls, 10) || 0,
        sessions: Number.parseInt(row.sessions, 10) || 0,
        pauses: Number.parseInt(row.pauses, 10) || 0,
        pausesPerSession: Number.parseInt(row.pausesPerSession, 10) || 0,
      };
    });
}

export function DialerAgentPage({ notify }) {
  const [startDate, setStartDate] = useState(DEFAULT_REPORT_DATE);
  const [endDate, setEndDate] = useState(DEFAULT_REPORT_DATE);
  const [agentUser, setAgentUser] = useState("");
  const [agentOptions, setAgentOptions] = useState([]);
  const [statsRows, setStatsRows] = useState([]);
  const [aprSortConfig, setAprSortConfig] = useState({
    key: "agentName",
    direction: "asc",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchAgentStats = useCallback(
    async (nextStartDate, nextEndDate, nextAgentUser) => {
      if (!nextStartDate || !nextEndDate) {
        setError("Select both start and end dates.");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const parsedStats = parseAgentStatsExport(
          await getDialerAgentStats(nextStartDate, nextEndDate, nextAgentUser),
        );

        setStatsRows(parsedStats);
        setLastUpdated(new Date().toLocaleString("en-IN"));
        if (parsedStats.length === 0) {
          notify?.(
            "No dialer agent stats found for the selected range.",
            "warning",
          );
        }
      } catch (loadError) {
        const message = `Dialer agent stats unavailable. ${loadError.message}`;
        setError(message);
        notify?.(message, "error");
      } finally {
        setIsLoading(false);
      }
    },
    [notify],
  );

  const loadAgentStats = useCallback(() => {
    fetchAgentStats(startDate, endDate, agentUser);
  }, [agentUser, endDate, fetchAgentStats, startDate]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      fetchAgentStats(DEFAULT_REPORT_DATE, DEFAULT_REPORT_DATE, "");
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [fetchAgentStats]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      fetchAgentStats(startDate, endDate, agentUser);
    }, AGENT_STATS_REFRESH_MS);

    return () => window.clearInterval(refreshTimer);
  }, [agentUser, endDate, fetchAgentStats, startDate]);

  useEffect(() => {
    const loadAgentOptions = window.setTimeout(() => {
      getAdminUsers()
        .then((users) => {
          const options = (Array.isArray(users) ? users : [])
            .filter(
              (user) =>
                user?.isActive !== false &&
                String(user?.dialerUser || "").trim(),
            )
            .map((user) => ({
              dialerUser: String(user.dialerUser).trim(),
              name: user.name || user.username || user.dialerUser,
            }))
            .sort((left, right) =>
              left.name.localeCompare(right.name, undefined, {
                numeric: true,
                sensitivity: "base",
              }),
            );

          setAgentOptions(options);
        })
        .catch((loadError) => {
          console.warn(
            "[Dialer Agent Stats] Could not load agent options:",
            loadError.message,
          );
        });
    }, 0);

    return () => window.clearTimeout(loadAgentOptions);
  }, []);

  const validStatsRows = useMemo(
    () => statsRows.filter((row) => !row.isError),
    [statsRows],
  );

  const errorStatsRows = useMemo(
    () => statsRows.filter((row) => row.isError),
    [statsRows],
  );

  const summary = useMemo(
    () =>
      validStatsRows.reduce(
        (total, row) => ({
          agents: total.agents + 1,
          calls: total.calls + row.calls,
          sessions: total.sessions + row.sessions,
          pauses: total.pauses + row.pauses,
          talkMinutes: total.talkMinutes + parseDurationMinutes(row.talkTime),
          waitMinutes: total.waitMinutes + parseDurationMinutes(row.waitTime),
        }),
        {
          agents: 0,
          calls: 0,
          sessions: 0,
          pauses: 0,
          talkMinutes: 0,
          waitMinutes: 0,
        },
      ),
    [validStatsRows],
  );

  const aprRows = useMemo(() => {
    const rows = validStatsRows.map((row) => {
      const totalCalls = row.calls || 0;
      const connectedCalls = row.calls || 0;
      const loginSeconds = parseDurationSeconds(row.loginTime);
      const readySeconds = parseDurationSeconds(row.waitTime);
      const totalTalkSeconds = parseDurationSeconds(row.totalTalkTime);
      const wrapSeconds = parseDurationSeconds(row.dispoTime);
      const idleSeconds = parseDurationSeconds(row.deadTime);

      return {
        id: row.id,
        agentName: row.fullName || row.user || "-",
        loginSeconds,
        readySeconds,
        totalTalkSeconds,
        wrapSeconds,
        idleSeconds,
        totalCalls,
        connectedCalls,
      };
    });
    const totalCalls = rows.reduce((total, row) => total + row.totalCalls, 0);
    const connectedCalls = rows.reduce(
      (total, row) => total + row.connectedCalls,
      0,
    );
    const totalRowValue = (key) => {
      const values = rows
        .map((row) => row[key])
        .filter((value) => Number.isFinite(value));

      return values.reduce((total, value) => total + value, 0);
    };

    return [
      ...rows,
      {
        id: "grand-total",
        isGrandTotal: true,
        agentName: "Grand Total",
        loginSeconds: totalRowValue("loginSeconds"),
        readySeconds: totalRowValue("readySeconds"),
        totalTalkSeconds: totalRowValue("totalTalkSeconds"),
        wrapSeconds: totalRowValue("wrapSeconds"),
        idleSeconds: totalRowValue("idleSeconds"),
        totalCalls,
        connectedCalls,
      },
    ];
  }, [validStatsRows]);

  const aprHeatValues = useMemo(
    () => ({
      loginSeconds: aprRows
        .filter((row) => !row.isGrandTotal)
        .map((row) => row.loginSeconds),
      readySeconds: aprRows
        .filter((row) => !row.isGrandTotal)
        .map((row) => row.readySeconds),
      totalTalkSeconds: aprRows
        .filter((row) => !row.isGrandTotal)
        .map((row) => row.totalTalkSeconds),
      wrapSeconds: aprRows
        .filter((row) => !row.isGrandTotal)
        .map((row) => row.wrapSeconds),
      idleSeconds: aprRows
        .filter((row) => !row.isGrandTotal)
        .map((row) => row.idleSeconds),
      totalCalls: aprRows
        .filter((row) => !row.isGrandTotal)
        .map((row) => row.totalCalls),
      connectedCalls: aprRows
        .filter((row) => !row.isGrandTotal)
        .map((row) => row.connectedCalls),
    }),
    [aprRows],
  );

  const sortedAprRows = useMemo(() => {
    const grandTotalRow = aprRows.find((row) => row.isGrandTotal);
    const sortedRows = aprRows
      .filter((row) => !row.isGrandTotal)
      .sort((left, right) => {
        const leftValue = left[aprSortConfig.key];
        const rightValue = right[aprSortConfig.key];
        const comparison =
          aprSortConfig.key === "agentName"
            ? String(leftValue || "").localeCompare(
                String(rightValue || ""),
                undefined,
                {
                  numeric: true,
                  sensitivity: "base",
                },
              )
            : (Number(leftValue) || 0) - (Number(rightValue) || 0);

        return aprSortConfig.direction === "asc" ? comparison : -comparison;
      });

    return grandTotalRow ? [...sortedRows, grandTotalRow] : sortedRows;
  }, [aprRows, aprSortConfig]);

  const changeAprSort = useCallback((key) => {
    setAprSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const getAprCellClass = useCallback(
    (row, key, reverse = false) => {
      if (row.isGrandTotal) {
        return "";
      }

      return getHeatClass(row[key], aprHeatValues[key] || [], reverse);
    },
    [aprHeatValues],
  );

  const exportDateLabel = `${startDate}-to-${endDate}`;

  const downloadAgentState = useCallback(() => {
    downloadHtmlExcel(`agent-state-${exportDateLabel}.xls`, "Agent State", [
      {
        title: "Agent State",
        columns: [
          { key: "fullName", label: "Agent" },
          { key: "user", label: "Dialer User" },
          { key: "userGroup", label: "Group" },
          { key: "calls", label: "Calls" },
          { key: "loginTime", label: "Login" },
          { key: "totalTalkTime", label: "Total Talk" },
          { key: "avgTalkTime", label: "Avg Talk" },
          { key: "avgWaitTime", label: "Avg Wait" },
          { key: "pctOfQueue", label: "Queue %" },
          { key: "pauseTime", label: "Pause" },
          { key: "sessions", label: "Sessions" },
          { key: "avgSession", label: "Avg Session" },
          { key: "pauses", label: "Pauses" },
          { key: "avgPauseTime", label: "Avg Pause" },
          { key: "pausePct", label: "Pause %" },
          { key: "pausesPerSession", label: "Pauses/Session" },
          { key: "waitTime", label: "Wait" },
          { key: "talkTime", label: "Talk" },
          { key: "dispoTime", label: "Dispo" },
          { key: "deadTime", label: "Dead" },
        ],
        rows: validStatsRows,
      },
      {
        title: "Agent Stats Errors",
        columns: [
          { key: "user", label: "Agent" },
          { key: "errorMessage", label: "Error" },
          {
            key: "date",
            label: "Date",
            value: () => `${startDate} to ${endDate}`,
          },
        ],
        rows: errorStatsRows,
      },
    ]);
  }, [endDate, errorStatsRows, exportDateLabel, startDate, validStatsRows]);

  const downloadAprReport = useCallback(() => {
    const aprColumns = [
      { key: "agentName", label: "Row Labels" },
      {
        key: "loginSeconds",
        label: "Login Time",
        value: (row) => formatDurationClock(row.loginSeconds),
      },
      {
        key: "readySeconds",
        label: "Ready Time",
        value: (row) => formatDurationClock(row.readySeconds),
      },
      {
        key: "totalTalkSeconds",
        label: "Talk Time",
        value: (row) => formatDurationClock(row.totalTalkSeconds),
      },
      {
        key: "wrapSeconds",
        label: "Wrap Time",
        value: (row) => formatDurationClock(row.wrapSeconds),
      },
      {
        key: "idleSeconds",
        label: "Idle Time",
        value: (row) => formatDurationClock(row.idleSeconds),
      },
      { key: "totalCalls", label: "Total Call" },
      { key: "connectedCalls", label: "Total Connected Calls" },
    ];

    downloadHtmlExcel(`apr-report-${exportDateLabel}.xls`, "APR Report", [
      {
        title: "APR Report",
        columns: aprColumns.map((column) => ({
          ...column,
          cellStyle: (row) => {
            if (row.isGrandTotal) {
              return "background:#0070c0;color:#ffffff;font-weight:700;";
            }

            if (column.key === "agentName") {
              return "font-weight:700;text-align:left;";
            }

            const reverse = column.key === "idleSeconds";
            return getHeatStyle(
              getHeatClass(
                row[column.key],
                aprHeatValues[column.key] || [],
                reverse,
              ),
            );
          },
        })),
        rows: aprRows,
      },
    ]);
  }, [aprHeatValues, aprRows, exportDateLabel]);

  const agentStatsColumns = [
    {
      key: "fullName",
      label: "Agent",
      render: (row) => (
        <>
          <strong>{row.fullName || "-"}</strong>
          <span>{row.user || "-"}</span>
        </>
      ),
      searchValue: (row) => `${row.fullName} ${row.user}`,
    },
    { key: "userGroup", label: "Group" },
    {
      key: "calls",
      label: "Calls",
      render: (row) => (
        <span className="dialer-chip dialer-chip--calls">
          {formatNumber(row.calls)}
        </span>
      ),
      sortValue: (row) => row.calls,
    },
    {
      key: "loginTime",
      label: "Login",
      sortValue: (row) => parseDurationMinutes(row.loginTime),
    },
    {
      key: "totalTalkTime",
      label: "Total Talk",
      sortValue: (row) => parseDurationMinutes(row.totalTalkTime),
    },
    {
      key: "avgTalkTime",
      label: "Avg Talk",
      sortValue: (row) => parseDurationMinutes(row.avgTalkTime),
    },
    {
      key: "avgWaitTime",
      label: "Avg Wait",
      sortValue: (row) => parseDurationMinutes(row.avgWaitTime),
    },
    {
      key: "pctOfQueue",
      label: "Queue %",
      sortValue: (row) => parsePercent(row.pctOfQueue),
    },
    {
      key: "pauseTime",
      label: "Pause",
      sortValue: (row) =>
        Number.parseInt(row.pauseTime, 10) ||
        parseDurationMinutes(row.pauseTime),
    },
    { key: "sessions", label: "Sessions", sortValue: (row) => row.sessions },
    {
      key: "avgSession",
      label: "Avg Session",
      sortValue: (row) => parseDurationMinutes(row.avgSession),
    },
    { key: "pauses", label: "Pauses", sortValue: (row) => row.pauses },
    {
      key: "avgPauseTime",
      label: "Avg Pause",
      sortValue: (row) => parseDurationMinutes(row.avgPauseTime),
    },
    {
      key: "pausePct",
      label: "Pause %",
      sortValue: (row) => parsePercent(row.pausePct),
    },
    {
      key: "pausesPerSession",
      label: "Pauses/Session",
      sortValue: (row) => row.pausesPerSession,
    },
    {
      key: "waitTime",
      label: "Wait",
      sortValue: (row) => parseDurationMinutes(row.waitTime),
    },
    {
      key: "talkTime",
      label: "Talk",
      sortValue: (row) => parseDurationMinutes(row.talkTime),
    },
    {
      key: "dispoTime",
      label: "Dispo",
      sortValue: (row) => parseDurationMinutes(row.dispoTime),
    },
    {
      key: "deadTime",
      label: "Dead",
      sortValue: (row) => parseDurationMinutes(row.deadTime),
    },
  ];
  const errorStatsColumns = [
    {
      key: "user",
      label: "Agent",
      render: (row) => (
        <>
          <strong>{row.user || "-"}</strong>
          <span>
            {row.fullName && !row.fullName.startsWith("ERROR:")
              ? row.fullName
              : "-"}
          </span>
        </>
      ),
      searchValue: (row) => `${row.user} ${row.fullName} ${row.errorMessage}`,
    },
    {
      key: "errorMessage",
      label: "Error",
      render: (row) => row.errorMessage || "-",
    },
    {
      key: "date",
      label: "Date",
      render: () => `${startDate} to ${endDate}`,
      searchable: false,
      sortable: false,
    },
  ];
  const aprReportColumns = [
    { key: "agentName", label: "Row Labels" },
    {
      key: "loginSeconds",
      label: "Login Time",
      value: (row) => formatDurationClock(row.loginSeconds),
    },
    {
      key: "readySeconds",
      label: "Ready Time",
      value: (row) => formatDurationClock(row.readySeconds),
    },
    {
      key: "totalTalkSeconds",
      label: "Talk Time",
      value: (row) => formatDurationClock(row.totalTalkSeconds),
    },
    {
      key: "wrapSeconds",
      label: "Wrap Time",
      value: (row) => formatDurationClock(row.wrapSeconds),
    },
    {
      key: "idleSeconds",
      label: "Idle Time",
      value: (row) => formatDurationClock(row.idleSeconds),
    },
    {
      key: "totalCalls",
      label: "Total Call",
      value: (row) => formatNumber(row.totalCalls),
    },
    {
      key: "connectedCalls",
      label: "Total Connected Calls",
      value: (row) => formatNumber(row.connectedCalls),
    },
  ];

  return (
    <div className="dialer-dashboard dialer-agent-report">
      <section className="admin-card admin-card--wide dialer-monitor">
        <div className="dialer-monitor__header">
          <div>
            <p className="eyebrow">ViciDial agent stats</p>
            <h2>Agent Call Details</h2>
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
              {error ? "Error" : isLoading ? "Loading" : "Ready"}
            </span>
            <small>Auto refresh: 1 min</small>
            <small>Updated: {lastUpdated || "--"}</small>
          </div>
        </div>

        <form
          className="dialer-agent-report__filters"
          onSubmit={(event) => {
            event.preventDefault();
            loadAgentStats();
          }}
        >
          <label>
            <span>Start date</span>
            <input
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </label>
          <label>
            <span>End date</span>
            <input
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </label>
          <label>
            <span>Agent user</span>
            <input
              list="dialer-agent-users"
              onChange={(event) => setAgentUser(event.target.value)}
              placeholder="All agents"
              value={agentUser}
            />
            <datalist id="dialer-agent-users">
              {agentOptions.map((option) => (
                <option
                  key={option.dialerUser}
                  label={option.name}
                  value={option.dialerUser}
                />
              ))}
            </datalist>
          </label>
          <button className="primary-action" disabled={isLoading} type="submit">
            {isLoading ? "Loading..." : "Load Stats"}
          </button>
        </form>

        {error && <p className="notice notice--error">{error}</p>}

        <section className="dialer-stat-grid">
          <article className="dialer-stat">
            <span>Agents</span>
            <strong>{formatNumber(summary.agents)}</strong>
          </article>
          <article className="dialer-stat dialer-stat--ready">
            <span>Calls</span>
            <strong>{formatNumber(summary.calls)}</strong>
          </article>
          <article className="dialer-stat dialer-stat--incall">
            <span>Talk Minutes</span>
            <strong>{formatNumber(summary.talkMinutes)}</strong>
          </article>
          <article className="dialer-stat dialer-stat--paused">
            <span>Wait Minutes</span>
            <strong>{formatNumber(summary.waitMinutes)}</strong>
          </article>
          <article className="dialer-stat dialer-stat--dispo">
            <span>Sessions</span>
            <strong>{formatNumber(summary.sessions)}</strong>
          </article>
          <article className="dialer-stat dialer-stat--dead">
            <span>Pauses</span>
            <strong>{formatNumber(summary.pauses)}</strong>
          </article>
        </section>

        <div className="dialer-agent-report__section-heading">
          <h3>Agent State</h3>
          <button
            className="secondary-action"
            disabled={
              validStatsRows.length === 0 && errorStatsRows.length === 0
            }
            onClick={downloadAgentState}
            type="button"
          >
            Download Excel
          </button>
        </div>
        <DataTable
          columns={agentStatsColumns}
          emptyText={
            isLoading ? "Loading agent stats..." : "No agent stats found."
          }
          pageSize={10}
          rows={validStatsRows}
          searchPlaceholder="Search agent stats"
        />

        <div className="dialer-agent-report__apr-section">
          <div className="dialer-agent-report__section-heading">
            <h3>APR Report</h3>
            <div className="dialer-agent-report__section-actions">
              <span>{formatNumber(validStatsRows.length)} agents</span>
              <button
                className="secondary-action"
                disabled={validStatsRows.length === 0}
                onClick={downloadAprReport}
                type="button"
              >
                Download Excel
              </button>
            </div>
          </div>
          <div className="apr-report-table">
            <table>
              <thead>
                <tr>
                  {aprReportColumns.map((column) => (
                    <th key={column.key}>
                      <button
                        onClick={() => changeAprSort(column.key)}
                        type="button"
                      >
                        <span>{column.label}</span>
                        {aprSortConfig.key === column.key && (
                          <b>
                            {aprSortConfig.direction === "asc" ? "Asc" : "Desc"}
                          </b>
                        )}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {validStatsRows.length === 0 || sortedAprRows.length === 0 ? (
                  <tr>
                    <td colSpan={aprReportColumns.length}>
                      No APR records found.
                    </td>
                  </tr>
                ) : (
                  sortedAprRows.map((row) => (
                    <tr
                      className={
                        row.isGrandTotal ? "apr-report-table__total" : ""
                      }
                      key={row.id}
                    >
                      {aprReportColumns.map((column) => {
                        const reverse = column.key === "idleSeconds";
                        const heatClass =
                          column.key === "agentName" || row.isGrandTotal
                            ? ""
                            : getAprCellClass(row, column.key, reverse);

                        return (
                          <td className={heatClass} key={column.key}>
                            {column.value ? column.value(row) : row[column.key]}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dialer-agent-report__error-section">
          <div className="dialer-agent-report__section-heading">
            <h3>Agent Stats Errors</h3>
            <span>{formatNumber(errorStatsRows.length)} records</span>
          </div>
          <DataTable
            columns={errorStatsColumns}
            emptyText="No agent stat errors found."
            pageSize={10}
            rows={errorStatsRows}
            searchPlaceholder="Search error records"
          />
        </div>
      </section>
    </div>
  );
}

export default DialerAgentPage;
