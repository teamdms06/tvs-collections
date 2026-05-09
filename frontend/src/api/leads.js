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

export async function uploadConsumerLeads(file, productKey = "consumer") {
  const formData = new FormData();
  formData.append("file", file);

  const token = localStorage.getItem("authToken");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(`${API_BASE_URL}/${productKey}/leads/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  return parseResponse(response);
}

export async function uploadLeadFile(file, productKey = "retail") {
  return uploadConsumerLeads(file, productKey);
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
