// The access token lives in memory only - never localStorage or a
// non-httpOnly cookie. That's the whole point of the split the backend
// already made (see docs/PERSON2_SUMMARY.md): the refresh token is an
// httpOnly cookie an XSS bug can't read, and the access token is short-lived
// enough that keeping it in memory (lost on tab close/refresh, recovered via
// one silent /auth/refresh call) is an acceptable trade for not persisting
// it anywhere JS can be tricked into reading.

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
