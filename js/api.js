// Thin fetch wrappers around the /api/* backend. Every call sends/receives
// the httpOnly session cookie automatically (same-origin, credentials
// default to "same-origin" which is what fetch already does for same-origin
// requests, kept explicit here for clarity).

async function request(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  let body = null;
  try { body = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const err = new Error((body && body.error) || `request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

export function signup({ username, password, wantsAdmin, adminCode }) {
  return request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, password, wantsAdmin, adminCode }),
  });
}

export function login({ username, password }) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return request("/api/auth/logout", { method: "POST" });
}

export function me() {
  return request("/api/me", { method: "GET" });
}

export function saveState(state) {
  return request("/api/state", {
    method: "PUT",
    body: JSON.stringify({ state }),
  });
}

export function migrate({ username, password, wantsAdmin, adminCode, localState }) {
  return request("/api/migrate", {
    method: "POST",
    body: JSON.stringify({ username, password, wantsAdmin, adminCode, localState }),
  });
}

export function ttsUrl(text) {
  return "/api/tts?q=" + encodeURIComponent(text);
}
