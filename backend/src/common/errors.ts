export class APIError extends Error {
  public readonly name: string;
  public readonly message: string;
  public readonly code: number;
  public readonly details?: any;

  constructor({
    name,
    message,
    code,
    details,
  }: {
    name: string;
    message: string;
    code?: number;
    details?: any;
  }) {
    super();
    this.name = name;
    this.message = message;
    this.code = code ?? 500;
    this.details = details;
  }
}

export class UserNotFoundError extends APIError {
  constructor() {
    super({
      name: "USER_NOT_FOUND",
      message: "User Not Found",
      code: 404,
    });
  }
}

export class ValidationError extends APIError {
  public readonly message: string;
  constructor(message: string) {
    super({
      name: "VALIDATION_ERROR",
      message: message,
      code: 400,
    });

    this.message = message;
  }
}

export class UnauthorizedError extends APIError {
  constructor(message = "Unauthorized") {
    super({
      name: "UNAUTHORIZED",
      message,
      code: 401,
    });
  }
}

export class ForbiddenError extends APIError {
  constructor(message = "Forbidden") {
    super({
      name: "FORBIDDEN",
      message,
      code: 403,
    });
  }
}

export class NotFoundError extends APIError {
  constructor(resource = "Resource") {
    super({
      name: "NOT_FOUND",
      message: `${resource} not found`,
      code: 404,
    });
  }
}

export class ConflictError extends APIError {
  constructor(message: string) {
    super({
      name: "CONFLICT",
      message,
      code: 409,
    });
  }
}
