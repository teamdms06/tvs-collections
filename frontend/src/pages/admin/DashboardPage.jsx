import { useEffect, useMemo, useState } from "react";
import { getAdminDashboard } from "../../api/admin";
import { DataTable, StatusBadge } from "./shared";
import { DialerDashboard } from "./dialer";
import { formatDateTime, formatMinutes, formatNumber } from "./utils";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [activeDashboardTab, setActiveDashboardTab] = useState("crm");
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(false);

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
  }, []);

  const statCards = useMemo(
    () => [
      { label: "Uploaded files", value: formatNumber(dashboard?.uploadedFiles) },
      { label: "Total leads", value: formatNumber(dashboard?.totalLeads) },
      { label: "Feedback today", value: formatNumber(dashboard?.feedbackToday) },
      { label: "Active users", value: formatNumber(dashboard?.activeUsers) },
      { label: "Total feedback", value: formatNumber(dashboard?.totalFeedback) },
      {
        label: "Users enabled",
        value: `${formatNumber(dashboard?.enabledUsers)} / ${formatNumber(dashboard?.totalUsers)}`,
      },
      { label: "Uploads today", value: formatNumber(dashboard?.uploadedToday) },
      {
        label: "Last refresh",
        value: dashboard?.generatedAt ? formatDateTime(dashboard.generatedAt) : "-",
      },
    ],
    [dashboard],
  );

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

      {dashboardError && <p className="notice notice--error">{dashboardError}</p>}
      {dashboardLoading && !dashboard && <p className="notice">Loading live dashboard data...</p>}

      <div className="admin-dashboard-tab-panel" hidden={activeDashboardTab !== "crm"}>
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
          <h2>Agent CRM Activity</h2>
          <DataTable
            columns={[
              {
                key: "name",
                label: "Agent",
                render: (activity) => (
                  <strong>
                    {activity.name || activity.username || "-"}
                    {activity.active && <span className="activity-live-dot">Live</span>}
                  </strong>
                ),
                searchValue: (activity) => `${activity.name || ""} ${activity.username || ""}`,
              },
              {
                key: "firstLoginAt",
                label: "First login",
                render: (activity) => formatDateTime(activity.firstLoginAt),
                sortValue: (activity) => activity.firstLoginAt || "",
              },
              {
                key: "lastLogoutAt",
                label: "Last logout",
                render: (activity) => (activity.active ? "Active" : formatDateTime(activity.lastLogoutAt)),
                sortValue: (activity) => activity.lastLogoutAt || "",
              },
              {
                key: "spanMinutes",
                label: "Login to logout",
                render: (activity) => formatMinutes(activity.spanMinutes),
                sortValue: (activity) => activity.spanMinutes || 0,
              },
              {
                key: "totalWorkMinutes",
                label: "Work",
                render: (activity) => formatMinutes(activity.totalWorkMinutes),
                sortValue: (activity) => activity.totalWorkMinutes || 0,
              },
              {
                key: "totalIdleMinutes",
                label: "Idle",
                render: (activity) => formatMinutes(activity.totalIdleMinutes),
                sortValue: (activity) => activity.totalIdleMinutes || 0,
              },
              {
                key: "punchCount",
                label: "Punches",
                render: (activity) => activity.punchCount || 0,
                sortValue: (activity) => activity.punchCount || 0,
              },
              {
                key: "punches",
                label: "Login - Logout",
                searchable: false,
                sortable: false,
                render: (activity) => (
                  <span className="activity-punch-summary">
                    {(activity.punches || []).map((punch, index) => (
                      <span key={`${activity.userId}-${punch.loginAt}-${index}`}>
                        {formatDateTime(punch.loginAt)} -{" "}
                        {punch.logoutAt ? formatDateTime(punch.logoutAt) : "Active"}
                      </span>
                    ))}
                  </span>
                ),
              },
            ]}
            emptyText="No CRM activity punches found for today."
            pageSize={8}
            rows={dashboard?.agentActivities || []}
            searchPlaceholder="Search agent activity"
          />
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
                  <StatusBadge status={upload.status || "-"} inactive={upload.status === "inactive"} />
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

      <div className="admin-dashboard-tab-panel" hidden={activeDashboardTab !== "dialer"}>
        <DialerDashboard />
      </div>
    </div>
  );
}
