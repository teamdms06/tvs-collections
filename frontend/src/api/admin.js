import { API_BASE_URL } from "./config";

function getAuthHeaders() {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
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
    const error =
      (data && typeof data === "object" && data.message) ||
      (typeof data === "string" && data) ||
      response.statusText ||
      "Server error";
    throw new Error(`${response.status} ${response.statusText}: ${error}`);
  }

  return data;
}

export async function getAdminDashboard() {
  const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
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

export async function exportFeedbackData(startDate, endDate) {
  const token = localStorage.getItem("authToken");
  const response = await fetch(
    `${API_BASE_URL}/admin/export/feedback?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
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
    const error =
      (data && typeof data === "object" && data.message) ||
      (typeof data === "string" && data) ||
      response.statusText ||
      "Server error";
    throw new Error(`${response.status} ${response.statusText}: ${error}`);
  }

  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);

  return {
    blob: await response.blob(),
    fileName: match?.[1] || `feedback-export-${startDate}-to-${endDate}.xlsx`,
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
