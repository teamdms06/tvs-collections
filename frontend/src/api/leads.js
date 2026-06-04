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
    const message = `${response.status} ${response.statusText}: ${error}`;
    throw new Error(message);
  }

  if (data === null) {
    return null;
  }

  return data;
}

function parsePayload(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getResponseError(status, statusText, payload) {
  const error =
    (payload && typeof payload === "object" && payload.message) ||
    (typeof payload === "string" && payload) ||
    statusText ||
    "Server error";
  return `${status} ${statusText}: ${error}`;
}

export async function uploadConsumerLeads(file, productKey = "consumer", options = {}) {
  const formData = new FormData();
  formData.append("file", file);
  if (options.progressId) {
    formData.append("progressId", options.progressId);
  }

  const token = localStorage.getItem("authToken");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE_URL}/${productKey}/leads/upload`);

    Object.entries(headers).forEach(([key, value]) => {
      request.setRequestHeader(key, value);
    });

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof options.onUploadProgress !== "function") {
        return;
      }

      options.onUploadProgress({
        loaded: event.loaded,
        total: event.total,
        percent: Math.round((event.loaded / event.total) * 100),
      });
    };

    request.onload = () => {
      const payload = parsePayload(request.responseText);

      if (request.status < 200 || request.status >= 300) {
        reject(new Error(getResponseError(request.status, request.statusText, payload)));
        return;
      }

      resolve(payload);
    };

    request.onerror = () => reject(new Error("Upload failed. Check network connection."));
    request.onabort = () => reject(new Error("Upload cancelled."));
    request.send(formData);
  });
}

export async function uploadLeadFile(file, productKey = "retail", options = {}) {
  return uploadConsumerLeads(file, productKey, options);
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

export async function searchConsumerLeads(query, productKey = "consumer") {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const response = await fetch(
    `${API_BASE_URL}/${productKey}/leads/search?q=${encodeURIComponent(normalizedQuery)}`,
    {
      headers: getAuthHeaders(),
    },
  );

  return parseResponse(response);
}

export async function getConsumerLeadById(leadId, productKey = "consumer") {
  const response = await fetch(
    `${API_BASE_URL}/${productKey}/leads/${leadId}`,
    {
      headers: getAuthHeaders(),
    },
  );
  return parseResponse(response);
}

export async function getUserDashboard() {
  const response = await fetch(`${API_BASE_URL}/user/dashboard`, {
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
}

export async function markUserActivity() {
  const response = await fetch(`${API_BASE_URL}/user/activity`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
}

export async function saveConsumerFeedback(
  leadId,
  feedback,
  productKey = "consumer",
) {
  console.log("Saving feedback for lead:", leadId, "Feedback:", feedback);
  const response = await fetch(
    `${API_BASE_URL}/${productKey}/leads/${leadId}/feedback`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(feedback),
    },
  );

  return parseResponse(response);
}
