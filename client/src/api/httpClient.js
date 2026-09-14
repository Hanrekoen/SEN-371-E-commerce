import { API_BASE_URL } from "./config";
import { getAccessToken, setAccessToken, clearAccessToken } from "./tokenStore";
import { ApiError } from "./ApiError";

// The Facade from ARCHITECTURE.md: every resource module calls request()
// instead of fetch, so base URL, auth header, refresh-on-401 and error shape
// live in exactly one place.

// Never refresh-and-retry these: refresh itself would loop, and on
// login/register a 401 means wrong credentials, not an expired token.
const NO_REFRESH_PATHS = ["/auth/refresh", "/auth/login", "/auth/register"];

let refreshInFlight = null;

/**
 * Shared in-flight promise so concurrent 401s trigger POST /auth/refresh once:
 * parallel refreshes would race to rotate the cookie.
 */
function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include", // sends the httpOnly refresh cookie
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.success) {
          clearAccessToken();
          throw new ApiError(body?.error?.message || "Session expired", {
            status: response.status,
            code: body?.error?.code || "SESSION_EXPIRED",
          });
        }
        setAccessToken(body.data.accessToken);
        return body.data.accessToken;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * @param {string} path         e.g. "/cart/items" - joined onto API_BASE_URL
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {object} [options.body]     plain object, JSON-stringified for you
 * @param {boolean} [options.auth]     send the Bearer header (default true)
 * @param {boolean} [options.withMeta] resolve { data, meta } instead of data
 *                                     alone - paginated endpoints need meta
 * @param {boolean} [options._retried] internal - prevents a refresh loop
 */
export async function request(path, { method = "GET", body, auth = true, withMeta = false, _retried = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: "include", // needed on /auth/* for the refresh cookie
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    // fetch throws (dropped connection, CORS, DNS) with no response to parse,
    // so this gets its own status-0 ApiError shape.
    throw new ApiError("Could not reach the server", {
      status: 0,
      code: "NETWORK_ERROR",
      details: networkErr.message,
    });
  }

  // 204 No Content (logout, some deletes) has no body to parse.
  const responseBody = response.status === 204 ? null : await response.json().catch(() => null);

  if (response.ok) {
    if (withMeta) return { data: responseBody?.data ?? null, meta: responseBody?.meta ?? null };
    return responseBody?.data ?? null;
  }

  const canRefresh = response.status === 401 && !_retried && !NO_REFRESH_PATHS.includes(path);
  if (canRefresh) {
    try {
      await refreshAccessToken();
      return request(path, { method, body, auth, withMeta, _retried: true });
    } catch {
      // refreshAccessToken already cleared the token; fall through and
      // surface the original 401 as a normal ApiError below.
    }
  }

  throw new ApiError(responseBody?.error?.message || "Request failed", {
    status: response.status,
    code: responseBody?.error?.code || "UNKNOWN_ERROR",
    details: responseBody?.error?.details || null,
  });
}
