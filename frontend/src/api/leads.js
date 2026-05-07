const API_BASE_URL = "http://localhost:4000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function parseResponse(response) {
  if (!response.ok) {
    const text = await response.text();
    const error = text || response.statusText || "Server error";
    throw new Error(error);
  }

  return response.json();
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

export async function saveConsumerFeedback(
  leadId,
  feedback,
  productKey = "consumer",
) {
  const response = await fetch(
    `${API_BASE_URL}/${productKey}/leads/${leadId}/feedback`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedback),
    },
  );

  return parseResponse(response);
}
