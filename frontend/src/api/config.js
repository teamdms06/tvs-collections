function normalizeApiBaseUrl(value) {
  const apiBaseUrl = String(value || "/api").trim().replace(/\/$/, "");

  if (/^https?:\/\//i.test(apiBaseUrl) || apiBaseUrl.startsWith("/")) {
    return apiBaseUrl;
  }

  return `/${apiBaseUrl}`;
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
