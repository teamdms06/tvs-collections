import { useCallback, useEffect, useMemo, useState } from "react";
import { getAdminDraftLeads } from "../../api/admin";
import { DataTable } from "./shared";
import { formatDateTime } from "./utils";

function getDraftFormData(draft) {
  if (!draft?.formDataJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(draft.formDataJson);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getDraftSummary(draft) {
  const formData = getDraftFormData(draft);
  const possibleValues = [
    formData.customerName,
    formData.customer_name,
    formData.name,
    formData.mobileNumber,
    formData.mobile_number,
    formData.phoneNumber,
    formData.phone_number,
    formData.disposition,
    formData.remarks,
  ].filter(Boolean);

  return possibleValues.slice(0, 3).join(" | ") || "-";
}

function createReminderMailto(draft) {
  const subject = `Please submit missed lead ${draft.agreementNumber || draft.leadId || ""}`.trim();
  const body = [
    `Hi ${draft.userName || draft.username || "Team"},`,
    "",
    "Please reopen and submit the missed/drafted lead data.",
    "",
    `Agreement: ${draft.agreementNumber || "-"}`,
    `Lead ID: ${draft.leadId || "-"}`,
    `Product: ${draft.productKey || "-"}`,
    `Last saved: ${formatDateTime(draft.updatedAt || draft.createdAt)}`,
    "",
    "Regards,",
    "Admin Team",
  ].join("\n");

  return `mailto:${encodeURIComponent(draft.userEmail || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

export default function DraftLeadsPage({ notify }) {
  const [drafts, setDrafts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDrafts = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await getAdminDraftLeads();
      setDrafts(Array.isArray(data) ? data : []);
    } catch (loadError) {
      const message = loadError.message || "Could not load draft leads.";
      setError(message);
      notify?.(message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const alertUser = (draft) => {
    if (!draft.userEmail) {
      notify?.("This user does not have an email configured.", "warning");
      return;
    }

    window.location.href = createReminderMailto(draft);
    notify?.("Reminder email opened for the selected user.", "success");
  };

  const exportDrafts = () => {
    const headers = [
      "Last Saved",
      "Created At",
      "User",
      "Username",
      "Dialer User",
      "Email",
      "Product",
      "Status",
      "Agreement",
      "Lead ID",
      "Disposition",
      "Sub Disposition",
      "UID",
      "Alternate Mobile",
      "Remark",
      "Draft Summary",
      "Form Data JSON",
    ];
    const csvRows = [
      headers.map(escapeCsvValue).join(","),
      ...drafts.map((draft) => {
        const formData = getDraftFormData(draft);

        return [
          formatDateTime(draft.updatedAt || draft.createdAt),
          formatDateTime(draft.createdAt),
          draft.userName || "",
          draft.username || "",
          draft.userDialerUser || "",
          draft.userEmail || "",
          draft.productKey || "",
          draft.leadStatus || "active",
          draft.agreementNumber || "",
          draft.leadId || "",
          formData.disposition || formData.status || "",
          formData.subDisposition || "",
          formData.uid || "",
          formData.alternateMobile || "",
          formData.remark || formData.remarks || "",
          getDraftSummary(draft),
          draft.formDataJson || "",
        ]
          .map(escapeCsvValue)
          .join(",");
      }),
    ];
    const today = new Date().toISOString().slice(0, 10);

    downloadCsv(`draft-leads-${today}.csv`, csvRows);
  };

  const columns = useMemo(
    () => [
      {
        key: "updatedAt",
        label: "Last Saved",
        render: (draft) => formatDateTime(draft.updatedAt || draft.createdAt),
        sortValue: (draft) => draft.updatedAt || draft.createdAt || "",
      },
      {
        key: "userName",
        label: "User",
        render: (draft) => (
          <>
            <strong>{draft.userName || "-"}</strong>
            <span>{draft.username || draft.userDialerUser || "-"}</span>
          </>
        ),
        searchValue: (draft) =>
          `${draft.userName || ""} ${draft.username || ""} ${draft.userDialerUser || ""}`,
      },
      { key: "userEmail", label: "Email" },
      {
        key: "productKey",
        label: "Product",
        render: (draft) => <span className="dialer-chip">{draft.productKey || "-"}</span>,
      },
      {
        key: "leadStatus",
        label: "Status",
        render: (draft) => (
          <span className="dialer-chip">{draft.leadStatus || "active"}</span>
        ),
      },
      { key: "agreementNumber", label: "Agreement" },
      {
        key: "leadId",
        label: "Lead ID",
        render: (draft) => draft.leadId || "-",
      },
      {
        key: "summary",
        label: "Draft Summary",
        render: getDraftSummary,
        searchValue: getDraftSummary,
      },
      {
        key: "action",
        label: "Action",
        searchable: false,
        sortable: false,
        render: (draft) => (
          <span className="admin-row-actions">
            <button
              className="secondary-action"
              disabled={!draft.userEmail}
              onClick={() => alertUser(draft)}
              type="button"
            >
              Alert User
            </button>
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="admin-dashboard-stack">
      <section className="admin-card admin-card--wide">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">Missed lead follow-up</p>
            <h2>Draft Leads</h2>
          </div>
          <div className="admin-actions">
            <button
              className="secondary-action"
              disabled={drafts.length === 0}
              onClick={exportDrafts}
              type="button"
            >
              Export Excel
            </button>
            <button className="secondary-action" onClick={loadDrafts} type="button">
              Refresh
            </button>
          </div>
        </div>

        {error && <p className="notice notice--error">{error}</p>}
        {isLoading && <p className="notice">Loading draft leads...</p>}

        <DataTable
          columns={columns}
          emptyText="No draft leads found."
          pageSize={25}
          rows={drafts}
          searchPlaceholder="Search draft leads"
        />
      </section>
    </div>
  );
}
