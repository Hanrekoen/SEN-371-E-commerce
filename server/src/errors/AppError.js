"use strict";

// PERSON 4 OWNS THIS FILE

class AppError extends Error {
  constructor(message, status = 500, code = "INTERNAL_ERROR", details = null) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = "Request validation failed", details = null) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do that") {
    super(message, 403, "FORBIDDEN");
  }
}

class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(resource + " not found", 404, "NOT_FOUND");
  }
}

class ConflictError extends AppError {
  constructor(message = "That already exists") {
    super(message, 409, "CONFLICT");
  }
}

class BusinessRuleError extends AppError {
  constructor(message = "That action is not allowed in the current state") {
    super(message, 422, "RULE_VIOLATION");
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests - please try again later") {
    super(message, 429, "TOO_MANY_REQUESTS");
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = "Service is temporarily unavailable") {
    super(message, 503, "SERVICE_UNAVAILABLE");
  }
}

module.exports = {
  AppError, ValidationError, UnauthorizedError,
  ForbiddenError, NotFoundError, ConflictError, BusinessRuleError,
  TooManyRequestsError, ServiceUnavailableError,
};
