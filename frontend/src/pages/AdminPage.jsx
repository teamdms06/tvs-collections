import { useEffect, useState } from "react";
import DashboardPage from "./admin/DashboardPage";
import DraftLeadsPage from "./admin/DraftLeadsPage";
import ExportDataPage from "./admin/ExportDataPage";
import HitCallLogsPage from "./admin/HitCallLogsPage";
import UploadDataPage from "./admin/UploadDataPage";
import UserManagerPage from "./admin/UserManagerPage";
import FollowUpPage from "./admin/FollowUpPage";
import { adminMenu } from "./admin/adminMenu";
import { Toast } from "./admin/shared";

function AdminServiceLoader({ activeMenu, notify, user }) {
  if (activeMenu === "dashboard") {
    return <DashboardPage />;
  }

  if (activeMenu === "upload") {
    return <UploadDataPage notify={notify} user={user} />;
  }

  if (activeMenu === "export") {
    return <ExportDataPage notify={notify} />;
  }

  if (activeMenu === "users") {
    return <UserManagerPage notify={notify} />;
  }

  if (activeMenu === "hit-calls") {
    return <HitCallLogsPage notify={notify} />;
  }

  if (activeMenu === "draft-leads") {
    return <DraftLeadsPage notify={notify} />;
  }

  if (activeMenu === "followups") {
    return <FollowUpPage notify={notify} />;
  }

  return <DashboardPage />;
}

export default function AdminPage({ onLogout, user }) {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
      <section
        className={`admin-shell ${isSidebarCollapsed ? "admin-shell--collapsed" : ""}`}
      >
        <aside className="admin-sidebar" aria-label="Admin menu">
          <div className="admin-brand">
            <span aria-hidden="true">TVS</span>
            <div>
              <strong>Collections Desk</strong>
              <small>Admin Portal</small>
            </div>
          </div>

          <nav className="admin-menu">
            {adminMenu.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  className={
                    item.key === activeMenu
                      ? "admin-menu-item admin-menu-item--active"
                      : "admin-menu-item"
                  }
                  key={item.key}
                  onClick={() => setActiveMenu(item.key)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  type="button"
                >
                  {Icon && (
                    <span className="admin-menu-icon" aria-hidden="true">
                      <Icon />
                    </span>
                  )}
                  <span className="admin-menu-label">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <button
            className="admin-sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
            aria-label={
              isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            <span aria-hidden="true">{isSidebarCollapsed ? "»" : "«"}</span>
          </button>

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
          <div className="admin-content-scroll">
            <AdminServiceLoader
              activeMenu={activeMenu}
              notify={notify}
              user={user}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
