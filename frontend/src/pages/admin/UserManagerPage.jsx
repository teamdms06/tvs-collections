import { useEffect, useState } from "react";
import {
  getAdminUserOptions,
  getAdminUsers,
  saveAdminUser,
  updateAdminUserAccess,
} from "../../api/admin";
import { DataTable, StatusBadge } from "./shared";

const emptyUserForm = {
  name: "",
  username: "",
  dialerUser: "",
  password: "",
  isActive: true,
  roles: ["agent"],
};

export default function UserManagerPage({ notify }) {
  const [users, setUsers] = useState([]);
  const [userOptions, setUserOptions] = useState({ roles: [], products: [] });
  const [usersError, setUsersError] = useState("");
  const [userFormMode, setUserFormMode] = useState("closed");
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [savingUser, setSavingUser] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
            products: Array.isArray(optionsData?.products) ? optionsData.products : [],
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
      dialerUser: selectedUser.dialerUser || "",
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
        dialerUser: userForm.dialerUser,
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
          return current.map((item) => (item.id === savedUser.id ? savedUser : item));
        }

        return [savedUser, ...current];
      });
      closeUserForm();
      setRefreshKey((current) => current + 1);
      notify(
        userFormMode === "edit" ? "User updated successfully." : "User created successfully.",
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

  return (
    <div className="admin-dashboard-stack">
      <section className="admin-card admin-card--wide">
        <div className="admin-section-heading">
          <h2>User Manager</h2>
          <button className="primary-action" onClick={openAddUserForm} type="button">
            Add New User
          </button>
        </div>

        {usersError && <p className="notice notice--error">{usersError}</p>}

        {userFormMode !== "closed" && (
          <form className="admin-user-form" onSubmit={submitUserForm}>
            <label className="form-field">
              <span>Name</span>
              <input
                onChange={(event) => updateUserForm("name", event.target.value)}
                required
                value={userForm.name}
              />
            </label>
            <label className="form-field">
              <span>Username</span>
              <input
                onChange={(event) => updateUserForm("username", event.target.value)}
                required
                value={userForm.username}
              />
            </label>
            <label className="form-field">
              <span>Dialer User</span>
              <input
                name="dialer_user"
                onChange={(event) => updateUserForm("dialerUser", event.target.value)}
                required
                value={userForm.dialerUser}
              />
            </label>
            <label className="form-field">
              <span>{userFormMode === "edit" ? "New Password" : "Password"}</span>
              <input
                onChange={(event) => updateUserForm("password", event.target.value)}
                placeholder={userFormMode === "edit" ? "Leave blank to keep current password" : ""}
                required={userFormMode === "add"}
                type="password"
                value={userForm.password}
              />
            </label>
            <label className="form-field">
              <span>Role</span>
              <select
                onChange={(event) => updateUserForm("roles", [event.target.value])}
                required
                value={userForm.roles[0] || ""}
              >
                <option value="">Select role</option>
                {(userOptions.roles.length ? userOptions.roles : ["admin", "agent"]).map((role) => (
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
              <button className="secondary-action" onClick={closeUserForm} type="button">
                Cancel
              </button>
              <button className="primary-action" disabled={savingUser} type="submit">
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
            { key: "dialerUser", label: "Dialer User" },
            {
              key: "roles",
              label: "Role",
              render: (managedUser) => managedUser.roles?.join(", ") || "-",
              searchValue: (managedUser) => managedUser.roles?.join(" ") || "",
            },
            {
              key: "accessProducts",
              label: "Access",
              render: (managedUser) => managedUser.accessProducts?.join(", ") || "-",
              searchValue: (managedUser) => managedUser.accessProducts?.join(" ") || "",
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
                      className={isActiveUser ? "danger-action" : "secondary-action"}
                      disabled={isUpdating}
                      onClick={() => changeUserAccess(managedUser.id, !isActiveUser)}
                      type="button"
                    >
                      {isUpdating ? "Updating..." : isActiveUser ? "Deactivate" : "Activate"}
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
