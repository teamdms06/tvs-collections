import { useCallback, useEffect, useMemo, useState } from "react";
import { getHitCallLogs } from "../../api/admin";
import { DataTable } from "./shared";

const HIT_CALL_REFRESH_MS = 15000;
const HIT_CALL_LOG_LIMIT = 3000;

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function selectedAgentLabel(row) {
  const agentUser = row.agentCall?.agentUser || row.selectedAgentUser;

  if (!agentUser) {
    return "Not picked yet";
  }

  return row.agentCall?.agentName || row.agentCall?.appAgentName || row.selectedAgentName || row.agentName || agentUser;
}

function getSelectedAgentDetail(row) {
  const detailJson = row?.agentCall?.agentDetailJson || row?.selectedAgentDetailJson;

  if (!detailJson) {
    return {};
  }

  try {
    const detail = JSON.parse(detailJson);
    if (!detail || typeof detail !== "object") {
      return {};
    }

    const status = String(detail.status || "").trim().toUpperCase();
    const leadId = String(detail.lead_id || "").trim();
    const hasLead = Boolean(leadId && leadId !== "0");
    const hasCallValue = Boolean(
      String(detail.callerid || "").trim() ||
        String(detail.phone_number || "").trim() ||
        String(detail.vendor_lead_code || "").trim(),
    );

    return status !== "READY" && (hasLead || hasCallValue) ? detail : {};
  } catch {
    return {};
  }
}

function getDetailValue(row, key, fallback = "") {
  const detail = getSelectedAgentDetail(row);
  return detail[key] || fallback || "-";
}

function getMappedCallValue(row, key, fallback = "") {
  const agentCall = row?.agentCall || {};
  const directValues = {
    status: agentCall.status,
    callerid: agentCall.callerId,
    lead_id: agentCall.leadId,
    campaign_id: agentCall.campaignId,
    calls_today: agentCall.callsToday,
    phone_number: agentCall.phoneNumber,
    vendor_lead_code: agentCall.vendorLeadCode,
    session_id: agentCall.sessionId,
  };

  const directValue = directValues[key];

  if (directValue !== undefined && directValue !== null && String(directValue).trim() !== "") {
    return directValue;
  }

  return getDetailValue(row, key, fallback);
}

function getExportValue(row, key, fallback = "") {
  const value = getMappedCallValue(row, key, fallback);
  return value === "-" ? "" : value;
}

function getHitCallStatus(row) {
  const detailStatus = getMappedCallValue(row, "status");

  if (detailStatus !== "-") {
    return detailStatus;
  }

  const status = row.agentCall?.status || row.selectedAgentStatus;

  return status && status !== "READY"
    ? status
    : "-";
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(fileName, rows) {
  const blob = new Blob([`\uFEFF${rows.join("\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function HitCallLogsPage({ notify }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError("");

    try {
      setLogs(await getHitCallLogs(HIT_CALL_LOG_LIMIT));
    } catch (loadError) {
      setError(loadError.message);
      notify?.(`Could not load hit calls: ${loadError.message}`, "error");
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [notify]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      loadLogs({ silent: true });
    }, HIT_CALL_REFRESH_MS);

    return () => window.clearInterval(refreshTimer);
  }, [loadLogs]);

  const exportLogs = () => {
    const headers = [
      "Hit Time",
      "Campaign",
      "Caller",
      "Selected Agent",
      "Agent User",
      "Status",
      "Caller ID",
      "Lead ID",
      "Agent Campaign",
      "Calls Today",
      "Phone Number",
      "Vendor Lead",
      "Session ID",
    ];
    const csvRows = [
      headers.map(escapeCsvValue).join(","),
      ...logs.map((row) =>
        [
          formatDateTime(row.observedAt),
          row.campaignId || "",
          row.caller || "",
          selectedAgentLabel(row),
          row.agentCall?.agentUser || row.selectedAgentUser || "",
          getHitCallStatus(row) === "-" ? "" : getHitCallStatus(row),
          getExportValue(row, "callerid"),
          getExportValue(row, "lead_id", row.selectedAgentLeadId),
          getExportValue(row, "campaign_id", row.campaignId),
          getExportValue(row, "calls_today"),
          getExportValue(row, "phone_number"),
          getExportValue(row, "vendor_lead_code"),
          getExportValue(row, "session_id", row.selectedAgentSessionId),
        ]
          .map(escapeCsvValue)
          .join(","),
      ),
    ];
    const today = new Date().toISOString().slice(0, 10);

    downloadCsv(`hit-call-logs-${today}.csv`, csvRows);
  };

  const columns = useMemo(
    () => [
      {
        key: "observedAt",
        label: "Hit Time",
        render: (row) => formatDateTime(row.observedAt),
        sortValue: (row) => row.observedAt || "",
      },
      {
        key: "campaignId",
        label: "Campaign",
        render: (row) => <span className="dialer-chip">{row.campaignId || "-"}</span>,
      },
      { key: "caller", label: "Caller" },
      {
        key: "selectedAgent",
        label: "Selected Agent",
        render: (row) => (
          <>
            <strong>{selectedAgentLabel(row)}</strong>
            <span>{row.agentCall?.agentUser || row.selectedAgentUser || "-"}</span>
          </>
        ),
        searchValue: (row) =>
          `${row.agentCall?.agentName || ""} ${row.agentCall?.agentUser || ""} ${row.selectedAgentName || ""} ${row.agentName || ""} ${row.selectedAgentUser || ""}`,
      },
      {
        key: "selectedAgentCallsToday",
        label: "Calls",
        render: (row) => (
          <span className="dialer-chip dialer-chip--calls">
            {getMappedCallValue(row, "calls_today")}
          </span>
        ),
        sortValue: (row) =>
          Number(getMappedCallValue(row, "calls_today")) || 0,
      },
      {
        key: "selectedAgentStatus",
        label: "Status",
        render: getHitCallStatus,
      },
      {
        key: "callerId",
        label: "Caller ID",
        render: (row) => getMappedCallValue(row, "callerid"),
        searchValue: (row) => getMappedCallValue(row, "callerid"),
      },
      {
        key: "leadId",
        label: "Lead ID",
        render: (row) => getMappedCallValue(row, "lead_id", row.selectedAgentLeadId),
        searchValue: (row) => getMappedCallValue(row, "lead_id", row.selectedAgentLeadId),
      },
      {
        key: "agentCampaignId",
        label: "Agent Campaign",
        render: (row) => (
          <span className="dialer-chip">
            {getMappedCallValue(row, "campaign_id", row.campaignId)}
          </span>
        ),
        searchValue: (row) => getMappedCallValue(row, "campaign_id", row.campaignId),
      },
      {
        key: "phoneNumber",
        label: "Phone Number",
        render: (row) => getMappedCallValue(row, "phone_number"),
        searchValue: (row) => getMappedCallValue(row, "phone_number"),
      },
      {
        key: "vendorLeadCode",
        label: "Vendor Lead",
        render: (row) => getMappedCallValue(row, "vendor_lead_code"),
        searchValue: (row) => getMappedCallValue(row, "vendor_lead_code"),
      },
      {
        key: "sessionId",
        label: "Session ID",
        render: (row) => getMappedCallValue(row, "session_id", row.selectedAgentSessionId),
        searchValue: (row) => getMappedCallValue(row, "session_id", row.selectedAgentSessionId),
      },
    ],
    [],
  );

  return (
    <div className="admin-dashboard-stack">
      <section className="admin-card admin-card--wide hit-call-logs">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">Auto search audit</p>
            <h2>Hit Call Logs</h2>
          </div>
          <div className="admin-actions">
            <button
              className="secondary-action"
              disabled={logs.length === 0}
              onClick={exportLogs}
              type="button"
            >
              Export Excel
            </button>
            <button className="secondary-action" onClick={() => loadLogs()} type="button">
              Refresh
            </button>
          </div>
        </div>

        {error && <p className="notice notice--error">{error}</p>}
        {isLoading && <p className="notice">Loading hit call logs...</p>}

        <DataTable
          columns={columns}
          emptyText="No hit calls have been tracked yet."
          pageSize={25}
          rows={logs}
          searchPlaceholder="Search hit calls"
        />
      </section>
    </div>
  );
}
