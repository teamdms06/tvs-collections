import { useCallback, useEffect, useMemo, useState } from "react";
import { getAdminFollowupLeads, getAdminUsers } from "../../api/admin";
import { DataTable } from "./shared";
import { formatDateTime } from "./utils";

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

export default function FollowUpPage({ notify }) {
  const [followups, setFollowups] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters
  const [selectedAgent, setSelectedAgent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadFollowups = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await getAdminFollowupLeads();
      setFollowups(Array.isArray(data) ? data : []);
    } catch (loadError) {
      const message = loadError.message || "Could not load follow-up leads.";
      setError(message);
      notify?.(message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await getAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("Failed to load users for filter:", e);
    }
  }, []);

  useEffect(() => {
    loadFollowups();
    loadUsers();
  }, [loadFollowups, loadUsers]);

  // Compute agents list from both full users list and fallback followups list
  const agentOptions = useMemo(() => {
    const optionsMap = new Map();
    // 1. Add all agents/users from the system
    users.forEach((u) => {
      const hasAgentRole = u.roles?.includes("agent") || !u.roles?.includes("admin");
      if (hasAgentRole && u.username) {
        optionsMap.set(u.username, u.name || u.username);
      }
    });
    // 2. Add any unique historical agent from follow-ups list
    followups.forEach((f) => {
      if (f.agentUsername && !optionsMap.has(f.agentUsername)) {
        optionsMap.set(f.agentUsername, f.agentName || f.agentUsername);
      }
    });
    return Array.from(optionsMap.entries())
      .map(([username, name]) => ({ username, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [users, followups]);

  // Compute filtered list based on selected agent and dates
  const filteredFollowups = useMemo(() => {
    return followups.filter((f) => {
      // Agent filter
      if (selectedAgent && f.agentUsername !== selectedAgent) {
        return false;
      }
      // Date filters
      if (f.date) {
        const fDate = new Date(f.date);
        if (startDate) {
          const sDate = new Date(startDate);
          sDate.setHours(0, 0, 0, 0);
          if (fDate < sDate) {
            return false;
          }
        }
        if (endDate) {
          const eDate = new Date(endDate);
          eDate.setHours(23, 59, 59, 999);
          if (fDate > eDate) {
            return false;
          }
        }
      }
      return true;
    });
  }, [followups, selectedAgent, startDate, endDate]);

  const exportFollowups = () => {
    const headers = [
      "Date",
      "Agent Name",
      "Agent Username",
      "Customer Name",
      "Agreement Number",
      "Mobile Number",
      "Alternate Mobile",
      "Disposition",
      "Sub Disposition",
      "PTP Amount",
      "PTP Date",
      "Call Back Date",
      "Call Back Time",
      "Source of Income",
      "Remark",
    ];
    const csvRows = [
      headers.map(escapeCsvValue).join(","),
      ...filteredFollowups.map((row) =>
        [
          formatDateTime(row.date),
          row.agentName || "",
          row.agentUsername || "",
          row.customerName || "",
          row.agreementNumber || "",
          row.mobileNumber || "",
          row.alternateMobileNumber || "",
          row.disposition || "",
          row.subDisposition || "",
          row.ptpAmount || "",
          row.ptpDate || "",
          row.callBackDate || "",
          row.callBackTime || "",
          row.sourceIncome || "",
          row.remark || "",
        ]
          .map(escapeCsvValue)
          .join(","),
      ),
    ];
    const today = new Date().toISOString().slice(0, 10);

    downloadCsv(`followup-leads-${today}.csv`, csvRows);
  };

  const columns = useMemo(
    () => [
      {
        key: "serialNumber",
        label: "S. No.",
        render: (_row, rowNumber) => rowNumber,
        searchable: false,
        sortable: false,
      },
      {
        key: "date",
        label: "Date",
        render: (row) => formatDateTime(row.date),
        sortValue: (row) => row.date || "",
      },
      {
        key: "agentName",
        label: "Agent",
        render: (row) => (
          <>
            <strong>{row.agentName || "-"}</strong>
            <span>{row.agentUsername || "-"}</span>
          </>
        ),
        searchValue: (row) =>
          `${row.agentName || ""} ${row.agentUsername || ""}`,
      },
      {
        key: "customerName",
        label: "Customer Details",
        render: (row) => (
          <>
            <strong>{row.customerName || "-"}</strong>
            <span style={{ fontSize: "0.85em", color: "#666" }}>
              Agr: {row.agreementNumber || "-"} | Mob: {row.mobileNumber || "-"}
            </span>
          </>
        ),
        searchValue: (row) =>
          `${row.customerName || ""} ${row.agreementNumber || ""} ${row.mobileNumber || ""}`,
      },
      {
        key: "disposition",
        label: "Disposition",
        render: (row) => (
          <>
            <strong>{row.disposition || "-"}</strong>
            <span>{row.subDisposition || "-"}</span>
          </>
        ),
        searchValue: (row) =>
          `${row.disposition || ""} ${row.subDisposition || ""}`,
      },
      {
        key: "actionDetails",
        label: "Follow-up Action Details",
        render: (row) => {
          if (row.callBackDate) {
            return (
              <span className="dialer-chip" style={{ backgroundColor: "#e2f0d9", color: "#385723" }}>
                Call Back: {row.callBackDate} {row.callBackTime || ""}
              </span>
            );
          }
          if (row.ptpDate) {
            return (
              <span className="dialer-chip" style={{ backgroundColor: "#fff2cc", color: "#7f6000" }}>
                PTP: ₹{row.ptpAmount || 0} on {row.ptpDate}
              </span>
            );
          }
          return <span style={{ color: "#aaa" }}>-</span>;
        },
        searchValue: (row) =>
          `${row.callBackDate || ""} ${row.ptpDate || ""} ${row.ptpAmount || ""}`,
      },
      { key: "remark", label: "Remark" },
    ],
    [],
  );

  return (
    <div className="admin-dashboard-stack">
      <section className="admin-card admin-card--wide">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">Consumer lead submissions</p>
            <h2>Follow-up Leads</h2>
          </div>
          <div className="admin-actions">
            <button
              className="secondary-action"
              disabled={filteredFollowups.length === 0}
              onClick={exportFollowups}
              type="button"
            >
              Export Excel
            </button>
            <button className="secondary-action" onClick={loadFollowups} type="button">
              Refresh
            </button>
          </div>
        </div>

        {error && <p className="notice notice--error">{error}</p>}
        {isLoading && <p className="notice">Loading follow-ups...</p>}

        <div
          className="admin-filters"
          style={{
            display: "flex",
            gap: "1.5rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            alignItems: "flex-end",
            background: "#f8f9fa",
            padding: "1rem",
            borderRadius: "6px",
            border: "1px solid #e9ecef",
          }}
        >
          <label className="form-field" style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#495057" }}>Filter by Agent</span>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={{ padding: "0.4rem 0.6rem", borderRadius: "4px", border: "1px solid #ced4da" }}
            >
              <option value="">All Agents</option>
              {agentOptions.map((agent) => (
                <option key={agent.username} value={agent.username}>
                  {agent.name} ({agent.username})
                </option>
              ))}
            </select>
          </label>
          <label className="form-field" style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#495057" }}>Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: "0.4rem 0.6rem", borderRadius: "4px", border: "1px solid #ced4da" }}
            />
          </label>
          <label className="form-field" style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#495057" }}>End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: "0.4rem 0.6rem", borderRadius: "4px", border: "1px solid #ced4da" }}
            />
          </label>
          <button
            className="secondary-action"
            type="button"
            disabled={!selectedAgent && !startDate && !endDate}
            onClick={() => {
              setSelectedAgent("");
              setStartDate("");
              setEndDate("");
            }}
            style={{
              height: "38px",
              padding: "0.4rem 1rem",
              alignSelf: "flex-end",
              cursor: "pointer",
            }}
          >
            Clear Filters
          </button>
        </div>

        <DataTable
          columns={columns}
          emptyText="No follow-up records found."
          pageSize={25}
          rows={filteredFollowups}
          searchPlaceholder="Search customer, agreement, disposition, remark"
        />
      </section>
    </div>
  );
}
