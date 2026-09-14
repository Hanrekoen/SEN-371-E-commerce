// In memory only - never localStorage or a non-httpOnly cookie, so XSS cannot
// read it. Deliberate trade: the token is lost on tab close/refresh and
// recovered by one silent /auth/refresh (the cookie is httpOnly).

let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}
