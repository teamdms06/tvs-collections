import { Fragment, useEffect, useMemo, useState } from "react";
import {
  exportFeedbackData,
  getAdminDashboard,
  getAdminUsers,
  getAdminUserOptions,
  getUploadedFiles,
  saveAdminUser,
  updateAdminUserAccess,
  updateUploadedFileAccess,
} from "../api/admin";
import { uploadLeadFile } from "../api/leads";
import { productConfigs } from "../data/formConfigs";

const adminMenu = [
  { key: "dashboard", label: "Dashboard" },
  { key: "report", label: "Report" },
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

const emptyUserForm = {
  name: "",
  username: "",
  password: "",
  isActive: true,
  roles: ["agent"],
};

function AdminContent({ activeMenu, user }) {
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
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
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
  const [exportError, setExportError] = useState("");
  const [isExporting, setIsExporting] = useState(false);

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

    if (!selectedFile) {
      setUploadError("Please select an Excel file.");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadResult(null);

    try {
      const result = await uploadLeadFile(selectedFile, selectedProduct);
      setUploadResult(result);
      setSelectedFile(null);
      setRefreshKey((current) => current + 1);
      event.currentTarget.reset();
    } catch (error) {
      setUploadError(error.message || "Upload failed.");
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
    } catch (error) {
      setUploadsError(
        error.message || "Could not update uploaded file access.",
      );
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
    } catch (error) {
      setUsersError(error.message || "Could not save user.");
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
    } catch (error) {
      setUsersError(error.message || "Could not update user status.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleExport = async (event) => {
    event.preventDefault();

    if (!exportStartDate || !exportEndDate) {
      setExportError("Select both start date and end date.");
      return;
    }

    if (exportEndDate < exportStartDate) {
      setExportError("End date must be after start date.");
      return;
    }

    setIsExporting(true);
    setExportError("");

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
    } catch (error) {
      setExportError(error.message || "Could not export feedback data.");
    } finally {
      setIsExporting(false);
    }
  };

  if (activeMenu === "dashboard") {
    return (
      <div className="admin-dashboard-stack">
        {dashboardError && (
          <p className="notice notice--error">{dashboardError}</p>
        )}
        {dashboardLoading && !dashboard && (
          <p className="notice">Loading live dashboard data...</p>
        )}

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
            <div className="admin-table admin-table--products">
              <span>Product</span>
              <span>Code</span>
              <span>Leads</span>
              {(dashboard?.productCounts || []).map((product) => (
                <Fragment key={product.productCode || product.productName}>
                  <strong>{product.productName || "-"}</strong>
                  <span>{product.productCode || "-"}</span>
                  <span>{formatNumber(product.leads)}</span>
                </Fragment>
              ))}
            </div>
          </article>

          <article className="admin-card admin-card--wide">
            <h2>Active User Sessions</h2>
            <div className="admin-table admin-table--sessions">
              <span>User</span>
              <span>Last seen</span>
              {(dashboard?.activeUserSessions || []).map((session) => (
                <Fragment key={session.username}>
                  <strong>{session.username}</strong>
                  <span>{formatDateTime(session.lastSeenAt)}</span>
                </Fragment>
              ))}
            </div>
          </article>
        </section>

        <section className="admin-card admin-card--wide">
          <h2>Recent Uploads</h2>
          <div className="admin-table admin-table--uploads">
            <span>File</span>
            <span>Product</span>
            <span>Saved</span>
            <span>Status</span>
            <span>Uploaded</span>
            {(dashboard?.recentUploads || []).map((upload) => (
              <Fragment key={upload.id}>
                <strong>{upload.fileName}</strong>
                <span>{upload.productName || upload.productCode || "-"}</span>
                <span>
                  {formatNumber(upload.validRecords)} /{" "}
                  {formatNumber(upload.totalRecords)}
                </span>
                <StatusBadge
                  status={upload.status || "-"}
                  inactive={upload.status === "inactive"}
                />
                <span>{formatDateTime(upload.uploadedAt)}</span>
              </Fragment>
            ))}
          </div>
        </section>
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

            {uploadError && (
              <p className="notice notice--error">{uploadError}</p>
            )}
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
          <div className="admin-table admin-table--upload-manager">
            <span>File</span>
            <span>Product</span>
            <span>Records</span>
            <span>Status</span>
            <span>Uploaded</span>
            <span>Action</span>
            {uploadedFiles.length === 0 && (
              <strong className="admin-table-empty">
                No uploaded files found.
              </strong>
            )}
            {uploadedFiles.map((upload) => {
              const isInactive = upload.status === "inactive";
              const isUpdating = updatingUploadId === upload.id;

              return (
                <Fragment key={upload.id}>
                  <strong>{upload.fileName}</strong>
                  <span>{upload.productName || upload.productCode || "-"}</span>
                  <span>
                    {formatNumber(upload.validRecords)} /{" "}
                    {formatNumber(upload.totalRecords)}
                  </span>
                  <StatusBadge
                    status={upload.status || "-"}
                    inactive={isInactive}
                  />
                  <span>{formatDateTime(upload.uploadedAt)}</span>
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
                </Fragment>
              );
            })}
          </div>
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
          {exportError && <p className="notice notice--error">{exportError}</p>}
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

          <div className="admin-table admin-table--users">
            <span>Name</span>
            <span>Username</span>
            <span>Role</span>
            <span>Access</span>
            <span>Status</span>
            <span>Action</span>
            {users.length === 0 && (
              <strong className="admin-table-empty">No users found.</strong>
            )}
            {users.map((managedUser) => {
              const isActiveUser = managedUser.isActive !== false;
              const isUpdating = updatingUserId === managedUser.id;

              return (
                <Fragment key={managedUser.id}>
                  <strong>{managedUser.name || "-"}</strong>
                  <span>{managedUser.username || "-"}</span>
                  <span>{managedUser.roles?.join(", ") || "-"}</span>
                  <span>{managedUser.accessProducts?.join(", ") || "-"}</span>
                  <StatusBadge status={isActiveUser} inactive={!isActiveUser} />
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
                </Fragment>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  return (
    <section className="admin-card admin-card--wide">
      <h2>Report</h2>
      <p>Report filters and collection summaries will load here.</p>
    </section>
  );
}

export default function AdminPage({ onLogout, user }) {
  const [activeMenu, setActiveMenu] = useState("dashboard");

  return (
    <main className="workspace-shell admin-workspace">
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
          <AdminContent activeMenu={activeMenu} user={user} />
        </div>
      </section>
    </main>
  );
}
