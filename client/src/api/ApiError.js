// Every failure the app deals with - a validation 400, a 401, a network
// drop, a 500 - becomes one of these, so UI code never has to branch on
// "is this a fetch error or a response error".
export class ApiError extends Error {
  constructor(message, { status = 0, code = "UNKNOWN_ERROR", details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
