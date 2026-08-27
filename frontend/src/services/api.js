const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export async function request(path, options = {}) {
  const token = localStorage.getItem("weathergpt-token");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "The weather service could not complete that request.");
  return data;
}
