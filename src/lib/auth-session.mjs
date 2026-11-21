// Pure helpers for the split auth flow: login (auth service) -> /api/me (clinical).

/**
 * Build the session object the UI expects from the clinical `/api/me` body and
 * the slim auth-service login body: `{...me, token}`. Never mutates inputs; the
 * login token always wins over anything `me` may carry.
 */
export function mergeSession(me, login) {
  if (!login || typeof login.token !== "string" || login.token === "") {
    throw new Error("Invalid login response: missing token")
  }
  return { ...me, token: login.token }
}

const UNAUTHENTICATED_ENDPOINTS = ["/api/auth/login", "/api/organizations"]

/**
 * Clinical and auth answer 401 for missing/expired/invalid tokens (403 is reserved
 * for authenticated-but-denied). A 401 on an authenticated endpoint ends the session;
 * a 401 on login itself just means bad credentials.
 */
export function isSessionExpired(status, endpoint) {
  return status === 401 && !UNAUTHENTICATED_ENDPOINTS.some((e) => endpoint === e || endpoint.startsWith(`${e}?`))
}
