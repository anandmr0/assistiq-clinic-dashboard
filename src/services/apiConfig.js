// Base URL comes from .env, fallback for local dev

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "https://assistiq-whatsapp-bot.onrender.com/api";

// Optional: common fetch wrapper
export const apiFetch = async (endpoint, options = {}) => {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "API request failed");
  }

  return res.json();
};