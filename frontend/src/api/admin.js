import { API_BASE_URL } from "./config";

function getAuthHeaders() {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function getResponseErrorMessage(response, data) {
  const message =
    (data && typeof data === "object" && data.message) ||
    (typeof data === "string" && !data.trim().startsWith("<") && data) ||
    response.statusText ||
    "Server error";

  return `${response.status} ${response.statusText}: ${message}`;
}

async function parseResponse(response) {
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new Error(getResponseErrorMessage(response, data));
  }

  return data;
}

export async function getAdminDashboard() {
  const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
}

export async function getDialerAgents() {
  const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE_URL}/admin/dialer/agents`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return parseResponse(response);
}

export async function getDialerAgent(agentUser) {
  const token = localStorage.getItem("authToken");
  const response = await fetch(
    `${API_BASE_URL}/admin/dialer/agent?user=${encodeURIComponent(agentUser)}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );

  return parseResponse(response);
}

export async function getDialerAgentStatuses(agentUsers) {
  const users = [...new Set(agentUsers.map((agentUser) => String(agentUser).trim()).filter(Boolean))];
  const response = await fetch(
    `${API_BASE_URL}/admin/dialer/agents/status`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ users }),
    },
  );

  return parseResponse(response);
}

export async function getDialerAgentStats(startDate, endDate, agentUser = "") {
  const params = new URLSearchParams({
    startDate,
    endDate,
  });

  if (agentUser.trim()) {
    params.set("agentUser", agentUser.trim());
  }

  const response = await fetch(
    `${API_BASE_URL}/admin/dialer/agent-stats?${params.toString()}`,
    {
      headers: getAuthHeaders(),
    },
  );

  return parseResponse(response);
}

export async function getHitCallLogs(limit = 200) {
  const response = await fetch(
    `${API_BASE_URL}/admin/hit-calls?limit=${encodeURIComponent(limit)}`,
    {
      headers: getAuthHeaders(),
    },
  );

  return parseResponse(response);
}

export async function createHitCallLog(payload) {
  const response = await fetch(`${API_BASE_URL}/admin/hit-calls`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function getAdminDraftLeads() {
  const response = await fetch(`${API_BASE_URL}/admin/draft-leads`, {
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
}

export async function getUploadedFiles() {
  const response = await fetch(`${API_BASE_URL}/admin/uploads`, {
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
}

export async function exportFeedbackData(startDate, endDate, mode = "all") {
  const token = localStorage.getItem("authToken");
  const response = await fetch(
    `${API_BASE_URL}/admin/export/feedback?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&mode=${encodeURIComponent(mode)}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );

  if (!response.ok) {
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    throw new Error(getResponseErrorMessage(response, data));
  }

  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);

  return {
    blob: await response.blob(),
    fileName: match?.[1] || `feedback-${mode}-export-${startDate}-to-${endDate}.xlsx`,
  };
}

export async function updateUploadedFileAccess(uploadId, isActive) {
  const action = isActive ? "activate" : "deactivate";
  const response = await fetch(`${API_BASE_URL}/admin/uploads/${uploadId}/${action}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
}

export async function uploadNcRecordFile(file, productKey = "retail", options = {}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("productKey", productKey);
  if (options.progressId) {
    formData.append("progressId", options.progressId);
  }

  const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE_URL}/admin/nc-records/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  return parseResponse(response);
}

export async function getUploadProgress(progressId) {
  const response = await fetch(
    `${API_BASE_URL}/uploads/progress/${encodeURIComponent(progressId)}`,
    {
      headers: getAuthHeaders(),
    },
  );

  return parseResponse(response);
}

export async function getAdminUsers() {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
}

export async function getAdminUserOptions() {
  const response = await fetch(`${API_BASE_URL}/admin/users/options`, {
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
}

export async function saveAdminUser(user, userId) {
  const response = await fetch(
    userId ? `${API_BASE_URL}/admin/users/${userId}` : `${API_BASE_URL}/admin/users`,
    {
      method: userId ? "PUT" : "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(user),
    },
  );

  return parseResponse(response);
}

export async function updateAdminUserAccess(userId, isActive) {
  const action = isActive ? "activate" : "deactivate";
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/${action}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
}

export async function getAdminFollowupLeads() {
  const response = await fetch(`${API_BASE_URL}/admin/leads/followups`, {
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
}
