// API errors

export interface ErrorResponse {
  errors: Array<{
    code: string;
    context: string | null;
    details: string | null;
    ghostErrorCode: string | null;
    help: string;
    id: string;
    message: string;
    property: string | null;
    type: string;
  }>;
}

export class APIError extends Error {
  public readonly response?: Response;
  public readonly data?: unknown;

  constructor(response?: Response, data?: unknown, message?: string, errorOptions?: ErrorOptions) {
    if (!message && response && response.url.includes('/ghost/api/admin/')) {
      message = `Something went wrong while loading ${response.url
        .replace(/.+\/ghost\/api\/admin\//, '')
        .replace(/\W.*/, '')
        .replace('_', ' ')}, please try again.`;
    }

    super(message || 'Something went wrong, please try again.', errorOptions);
    this.response = response;
    this.data = data;
  }
}

export class JSONError extends APIError {
  public readonly data?: ErrorResponse;

  constructor(
    response: Response | undefined,
    data?: ErrorResponse,
    message?: string,
    errorOptions?: ErrorOptions,
  ) {
    super(response, data, message, errorOptions);
    this.data = data;
  }
}

export class VersionMismatchError extends JSONError {
  constructor(response: Response, data: ErrorResponse, errorOptions?: ErrorOptions) {
    super(
      response,
      data,
      'API server is running a newer version of Ghost, please upgrade.',
      errorOptions,
    );
  }
}

export class ServerUnreachableError extends APIError {
  constructor(errorOptions?: ErrorOptions) {
    super(undefined, undefined, 'Something went wrong, please try again.', errorOptions);
  }
}

export class TimeoutError extends APIError {
  constructor(errorOptions?: ErrorOptions) {
    super(undefined, undefined, 'Request timed out, please try again.', errorOptions);
  }
}

export class RequestEntityTooLargeError extends APIError {
  constructor(response: Response, data: unknown, errorOptions?: ErrorOptions) {
    super(
      response,
      data,
      'Request is larger than the maximum file size the server allows',
      errorOptions,
    );
  }
}

export class UnsupportedMediaTypeError extends APIError {
  constructor(response: Response, data: unknown, errorOptions?: ErrorOptions) {
    super(response, data, 'Request contains an unknown or unsupported file type.', errorOptions);
  }
}

export class MaintenanceError extends APIError {
  constructor(response: Response, data: unknown, errorOptions?: ErrorOptions) {
    super(
      response,
      data,
      'Ghost is currently undergoing maintenance, please wait a moment then retry.',
      errorOptions,
    );
  }
}

export class UnauthorizedError extends APIError {
  constructor(response: Response, data: unknown, errorOptions?: ErrorOptions) {
    super(response, data, 'You are not authorised to make this request.', errorOptions);
  }
}

export class SessionExpiredError extends UnauthorizedError {}

export class ThemeValidationError extends JSONError {
  constructor(response: Response, data: ErrorResponse, errorOptions?: ErrorOptions) {
    super(response, data, 'Theme is not compatible or contains errors.', errorOptions);
  }
}

export interface HostLimitErrorDetails {
  name?: string;
  limit?: number;
  total?: number;
}

interface HostLimitOptions {
  message?: string;
  errorDetails?: HostLimitErrorDetails;
  help?: string;
}

// Constructed two ways: from an API error response, and by @tryghost/limit-service
// (via useLimiter), which news the registered class with a single options object.
export class HostLimitError extends JSONError {
  public readonly errorDetails?: HostLimitErrorDetails;

  constructor(response: Response, data: ErrorResponse, errorOptions?: ErrorOptions);
  constructor(limit: HostLimitOptions);
  constructor(
    responseOrLimit: Response | HostLimitOptions,
    data?: ErrorResponse,
    errorOptions?: ErrorOptions,
  ) {
    if (responseOrLimit instanceof Response) {
      super(responseOrLimit, data, 'A hosting plan limit was reached or exceeded.', errorOptions);
    } else {
      super(
        undefined,
        undefined,
        responseOrLimit.message || 'A hosting plan limit was reached or exceeded.',
      );
      this.errorDetails = responseOrLimit.errorDetails;
    }
  }
}

export class EmailError extends JSONError {
  constructor(response: Response, data: ErrorResponse, errorOptions?: ErrorOptions) {
    super(response, data, 'Please verify your email settings', errorOptions);
  }
}

export class ValidationError extends JSONError {
  constructor(response: Response, data: ErrorResponse, errorOptions?: ErrorOptions) {
    super(response, data, data.errors[0].message, errorOptions);
  }
}

export const errorsWithMessage = [
  ValidationError,
  ThemeValidationError,
  HostLimitError,
  EmailError,
];

/**
 * What the server said went wrong, for showing to a person.
 *
 * The API serializer rewrites `message` to a generic summary and leaves the sentence that
 * explains the failure — and usually what to do about it — in `context`, so that is read
 * first. Any error carrying an API body is read the same way: a caller should not have to
 * know which class it got back to find the text, and reading only one class left every
 * other one showing "Could not save…" while the reason sat unread in the payload.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  const apiError = error instanceof JSONError ? error.data?.errors?.[0] : undefined;

  return apiError?.context || apiError?.message || fallback;
}

// Frontend errors

export class AlreadyExistsError extends Error {
  constructor(message?: string) {
    super(message);
  }
}
