import {
    APIError,
    JSONError,
    VersionMismatchError,
    ServerUnreachableError,
    TimeoutError,
    RequestEntityTooLargeError,
    UnsupportedMediaTypeError,
    MaintenanceError,
    ThemeValidationError,
    HostLimitError,
    EmailError,
    ValidationError,
    AlreadyExistsError,
    errorsWithMessage,
    ErrorResponse
} from '../../../src/utils/errors';

describe('errors utils', () => {
    const mockErrorResponse: ErrorResponse = {
        errors: [{
            code: 'TEST_ERROR',
            context: 'Test context',
            details: 'Test details',
            ghostErrorCode: 'GHOST_TEST_ERROR',
            help: 'Test help',
            id: 'test-id',
            message: 'Test error message',
            property: 'testProperty',
            type: 'TestError'
        }]
    };

    describe('APIError', () => {
        it('creates error with custom message', () => {
            const error = new APIError(undefined, undefined, 'Custom error message');
            expect(error.message).toBe('Custom error message');
            expect(error.response).toBeUndefined();
            expect(error.data).toBeUndefined();
        });

        it('creates error with default message when no message provided', () => {
            const error = new APIError();
            expect(error.message).toBe('Something went wrong, please try again.');
        });

        it('creates error with response and data', () => {
            const mockResponse = new Response();
            const mockData = {error: 'test'};
            const error = new APIError(mockResponse, mockData);
            expect(error.response).toBe(mockResponse);
            expect(error.data).toBe(mockData);
        });

        it('generates message from admin API URL', () => {
            const mockResponse = new Response(null, {
                status: 400,
                statusText: 'Bad Request'
            });
            Object.defineProperty(mockResponse, 'url', {
                value: 'https://example.com/ghost/api/admin/posts/1234',
                writable: false
            });
            const error = new APIError(mockResponse);
            expect(error.message).toBe('Something went wrong while loading posts, please try again.');
        });

        it('handles admin API URL with underscores', () => {
            const mockResponse = new Response(null, {
                status: 400,
                statusText: 'Bad Request'
            });
            Object.defineProperty(mockResponse, 'url', {
                value: 'https://example.com/ghost/api/admin/email_previews/1234',
                writable: false
            });
            const error = new APIError(mockResponse);
            expect(error.message).toBe('Something went wrong while loading email previews, please try again.');
        });

        it('handles admin API URL with query params', () => {
            const mockResponse = new Response(null, {
                status: 400,
                statusText: 'Bad Request'
            });
            Object.defineProperty(mockResponse, 'url', {
                value: 'https://example.com/ghost/api/admin/members?filter=status:free',
                writable: false
            });
            const error = new APIError(mockResponse);
            expect(error.message).toBe('Something went wrong while loading members, please try again.');
        });

        it('uses custom message even with admin API URL', () => {
            const mockResponse = new Response(null, {
                status: 400,
                statusText: 'Bad Request'
            });
            Object.defineProperty(mockResponse, 'url', {
                value: 'https://example.com/ghost/api/admin/posts',
                writable: false
            });
            const error = new APIError(mockResponse, undefined, 'Custom message');
            expect(error.message).toBe('Custom message');
        });

        it('handles non-admin API URLs', () => {
            const mockResponse = new Response(null, {
                status: 400,
                statusText: 'Bad Request'
            });
            Object.defineProperty(mockResponse, 'url', {
                value: 'https://example.com/api/content/posts',
                writable: false
            });
            const error = new APIError(mockResponse);
            expect(error.message).toBe('Something went wrong, please try again.');
        });

        it('accepts error options', () => {
            const cause = new Error('Original error');
            const error = new APIError(undefined, undefined, 'Test error', {cause});
            expect(error.cause).toBe(cause);
        });
    });

    describe('JSONError', () => {
        it('creates error with response and error data', () => {
            const mockResponse = new Response();
            const error = new JSONError(mockResponse, mockErrorResponse, 'JSON error');
            expect(error.response).toBe(mockResponse);
            expect(error.data).toBe(mockErrorResponse);
            expect(error.message).toBe('JSON error');
        });

        it('inherits from APIError', () => {
            const mockResponse = new Response();
            const error = new JSONError(mockResponse, mockErrorResponse);
            expect(error).toBeInstanceOf(APIError);
        });
    });

    describe('VersionMismatchError', () => {
        it('creates error with specific message', () => {
            const mockResponse = new Response();
            const error = new VersionMismatchError(mockResponse, mockErrorResponse);
            expect(error.message).toBe('API server is running a newer version of Ghost, please upgrade.');
            expect(error.response).toBe(mockResponse);
            expect(error.data).toBe(mockErrorResponse);
        });

        it('inherits from JSONError', () => {
            const mockResponse = new Response();
            const error = new VersionMismatchError(mockResponse, mockErrorResponse);
            expect(error).toBeInstanceOf(JSONError);
        });
    });

    describe('ServerUnreachableError', () => {
        it('creates error with default message', () => {
            const error = new ServerUnreachableError();
            expect(error.message).toBe('Something went wrong, please try again.');
            expect(error.response).toBeUndefined();
            expect(error.data).toBeUndefined();
        });

        it('accepts error options', () => {
            const cause = new Error('Network error');
            const error = new ServerUnreachableError({cause});
            expect(error.cause).toBe(cause);
        });
    });

    describe('TimeoutError', () => {
        it('creates error with timeout message', () => {
            const error = new TimeoutError();
            expect(error.message).toBe('Request timed out, please try again.');
            expect(error.response).toBeUndefined();
            expect(error.data).toBeUndefined();
        });
    });

    describe('RequestEntityTooLargeError', () => {
        it('creates error with size limit message', () => {
            const mockResponse = new Response();
            const mockData = {size: 10485760};
            const error = new RequestEntityTooLargeError(mockResponse, mockData);
            expect(error.message).toBe('Request is larger than the maximum file size the server allows');
            expect(error.response).toBe(mockResponse);
            expect(error.data).toBe(mockData);
        });
    });

    describe('UnsupportedMediaTypeError', () => {
        it('creates error with media type message', () => {
            const mockResponse = new Response();
            const mockData = {type: 'application/unknown'};
            const error = new UnsupportedMediaTypeError(mockResponse, mockData);
            expect(error.message).toBe('Request contains an unknown or unsupported file type.');
            expect(error.response).toBe(mockResponse);
            expect(error.data).toBe(mockData);
        });
    });

    describe('MaintenanceError', () => {
        it('creates error with maintenance message', () => {
            const mockResponse = new Response();
            const mockData = {maintenance: true};
            const error = new MaintenanceError(mockResponse, mockData);
            expect(error.message).toBe('Ghost is currently undergoing maintenance, please wait a moment then retry.');
            expect(error.response).toBe(mockResponse);
            expect(error.data).toBe(mockData);
        });
    });

    describe('ThemeValidationError', () => {
        it('creates error with theme validation message', () => {
            const mockResponse = new Response();
            const error = new ThemeValidationError(mockResponse, mockErrorResponse);
            expect(error.message).toBe('Theme is not compatible or contains errors.');
            expect(error.response).toBe(mockResponse);
            expect(error.data).toBe(mockErrorResponse);
        });

        it('is included in errorsWithMessage', () => {
            expect(errorsWithMessage).toContain(ThemeValidationError);
        });
    });

    describe('HostLimitError', () => {
        it('creates error with host limit message', () => {
            const mockResponse = new Response();
            const error = new HostLimitError(mockResponse, mockErrorResponse);
            expect(error.message).toBe('A hosting plan limit was reached or exceeded.');
            expect(error.response).toBe(mockResponse);
            expect(error.data).toBe(mockErrorResponse);
        });

        it('is included in errorsWithMessage', () => {
            expect(errorsWithMessage).toContain(HostLimitError);
        });
    });

    describe('EmailError', () => {
        it('creates error with email settings message', () => {
            const mockResponse = new Response();
            const error = new EmailError(mockResponse, mockErrorResponse);
            expect(error.message).toBe('Please verify your email settings');
            expect(error.response).toBe(mockResponse);
            expect(error.data).toBe(mockErrorResponse);
        });

        it('is included in errorsWithMessage', () => {
            expect(errorsWithMessage).toContain(EmailError);
        });
    });

    describe('ValidationError', () => {
        it('uses first error message from response', () => {
            const mockResponse = new Response();
            const error = new ValidationError(mockResponse, mockErrorResponse);
            expect(error.message).toBe('Test error message');
            expect(error.response).toBe(mockResponse);
            expect(error.data).toBe(mockErrorResponse);
        });

        it('handles multiple errors in response', () => {
            const mockResponse = new Response();
            const multiErrorResponse: ErrorResponse = {
                errors: [
                    {...mockErrorResponse.errors[0], message: 'First error'},
                    {...mockErrorResponse.errors[0], message: 'Second error'}
                ]
            };
            const error = new ValidationError(mockResponse, multiErrorResponse);
            expect(error.message).toBe('First error');
        });

        it('is included in errorsWithMessage', () => {
            expect(errorsWithMessage).toContain(ValidationError);
        });
    });

    describe('AlreadyExistsError', () => {
        it('creates error with custom message', () => {
            const error = new AlreadyExistsError('Item already exists');
            expect(error.message).toBe('Item already exists');
        });

        it('creates error without message', () => {
            const error = new AlreadyExistsError();
            expect(error.message).toBe('');
        });

        it('inherits from Error', () => {
            const error = new AlreadyExistsError();
            expect(error).toBeInstanceOf(Error);
        });
    });

    describe('errorsWithMessage', () => {
        it('contains all expected error types', () => {
            expect(errorsWithMessage).toHaveLength(4);
            expect(errorsWithMessage).toContain(ValidationError);
            expect(errorsWithMessage).toContain(ThemeValidationError);
            expect(errorsWithMessage).toContain(HostLimitError);
            expect(errorsWithMessage).toContain(EmailError);
        });
    });

    describe('ErrorResponse interface', () => {
        it('validates error response structure', () => {
            const response: ErrorResponse = {
                errors: [{
                    code: 'ERR_CODE',
                    context: null,
                    details: null,
                    ghostErrorCode: null,
                    help: 'Help text',
                    id: 'error-id',
                    message: 'Error message',
                    property: null,
                    type: 'ErrorType'
                }]
            };

            expect(response.errors).toHaveLength(1);
            expect(response.errors[0].code).toBe('ERR_CODE');
            expect(response.errors[0].context).toBeNull();
        });
    });
});