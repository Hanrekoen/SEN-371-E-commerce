// Every failure (400, 401, network drop, 500) becomes one of these, so UI code
// never branches on "is this a fetch error or a response error".
export class ApiError extends Error {
  constructor(message, { status = 0, code = "UNKNOWN_ERROR", details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
