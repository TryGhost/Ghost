interface ErrorResponse {
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
        public readonly response: Response,
        public readonly data?: unknown,
        message?: string
    ) {
        super(message || response.statusText);
    }
}

export class JSONError extends APIError {
    constructor(
        response: Response,
        public readonly data?: ErrorResponse,
        message?: string
    ) {
        super(response, data, message);
    }
}

export class ValidationError extends JSONError {
    constructor(response: Response, data: ErrorResponse) {
        super(response, data, data.errors[0].message);
    }
}

export class AlreadyExistsError extends Error {
    constructor(message?: string) {
        super(message);
    }
}
