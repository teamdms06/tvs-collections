import { API_BASE_URL } from "./config";

function getAuthHeaders() {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * Save a draft lead.
 * @param {{agreementNumber:string, leadId?:number, productKey?:string, formDataJson:string}} draft
 */
export async function saveDraft(draft) {
  const response = await fetch(`${API_BASE_URL}/drafts`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(draft),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to save draft: ${response.status} ${text}`);
  }
  return response.json();
}

/**
 * List drafts for the current user, optionally filtered by product.
 */
export async function listDrafts(productKey) {
  const url = new URL(`${API_BASE_URL}/drafts`);
  if (productKey) {
    url.searchParams.append("productKey", productKey);
  }
  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to list drafts: ${response.status} ${text}`);
  }
  return response.json();
}

/**
 * Delete a draft by id.
 */
export async function deleteDraft(id) {
  const response = await fetch(`${API_BASE_URL}/drafts/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to delete draft: ${response.status} ${text}`);
  }
}
