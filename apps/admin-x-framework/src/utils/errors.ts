// API errors

export interface ErrorResponse {
    errors: Array<{
        code: string
        context: string | null
        details: string | null
        ghostErrorCode: string | null
        help: string
        id: string
        message: string
        property: string | null
        type: string
    }>
}

export class APIError extends Error {
    constructor(
        public readonly response?: Response,
        public readonly data?: unknown,
        message?: string,
        errorOptions?: ErrorOptions
    ) {
        if (!message && response && response.url.includes('/ghost/api/admin/')) {
            message = `Something went wrong while loading ${response.url.replace(/.+\/ghost\/api\/admin\//, '').replace(/\W.*/, '').replace('_', ' ')}, please try again.`;
        }

        super(message || 'Something went wrong, please try again.', errorOptions);
    }
}

export class JSONError extends APIError {
    constructor(
        response: Response,
        public readonly data?: ErrorResponse,
        message?: string,
        errorOptions?: ErrorOptions
    ) {
        super(response, data, message, errorOptions);
    }
}

export class VersionMismatchError extends JSONError {
    constructor(response: Response, data: ErrorResponse, errorOptions?: ErrorOptions) {
        super(response, data, 'API server is running a newer version of Ghost, please upgrade.', errorOptions);
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
        super(response, data, 'Request is larger than the maximum file size the server allows', errorOptions);
    }
}

export class UnsupportedMediaTypeError extends APIError {
    constructor(response: Response, data: unknown, errorOptions?: ErrorOptions) {
        super(response, data, 'Request contains an unknown or unsupported file type.', errorOptions);
    }
}

export class MaintenanceError extends APIError {
    constructor(response: Response, data: unknown, errorOptions?: ErrorOptions) {
        super(response, data, 'Ghost is currently undergoing maintenance, please wait a moment then retry.', errorOptions);
    }
}

export class ThemeValidationError extends JSONError {
    constructor(response: Response, data: ErrorResponse, errorOptions?: ErrorOptions) {
        super(response, data, 'Theme is not compatible or contains errors.', errorOptions);
    }
}

export class HostLimitError extends JSONError {
    constructor(response: Response, data: ErrorResponse, errorOptions?: ErrorOptions) {
        super(response, data, 'A hosting plan limit was reached or exceeded.', errorOptions);
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

export const errorsWithMessage = [ValidationError, ThemeValidationError, HostLimitError, EmailError];

// Frontend errors

export class AlreadyExistsError extends Error {
    constructor(message?: string) {
        super(message);
    }
}
