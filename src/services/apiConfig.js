// Base URL comes from .env, fallback for local dev

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "https://assistiq-whatsapp-bot.onrender.com/api";
  const AUTH_KEY = 'assistiq_auth';
function getToken() {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    return stored ? JSON.parse(stored).token : null;
  } catch {
    return null;
  }
}
// Optional: common fetch wrapper
export const apiFetch = async (endpoint, options = {}) => {
   const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
 const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    // Token expired or invalid — clear session and redirect to login
    localStorage.removeItem(AUTH_KEY);
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (res.status === 403) {
    throw new Error('You do not have permission to perform this action');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json().catch(() => null);
};