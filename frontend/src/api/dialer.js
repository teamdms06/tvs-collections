import { API_BASE_URL } from "./config";

export async function getMyDialerAgentStatus() {
  const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE_URL}/dialer/my-agent-status`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text || "Dialer request failed"}`);
  }

  return text;
}

export async function saveAgentCallLog(payload) {
  const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE_URL}/agent-call-logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text || "Agent call log save failed"}`);
  }

  return text ? JSON.parse(text) : null;
}
