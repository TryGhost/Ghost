import {APIError, EmailError, ErrorResponse, HostLimitError, JSONError, MaintenanceError, RequestEntityTooLargeError, ServerUnreachableError, ThemeValidationError, UnauthorizedError, UnsupportedMediaTypeError, ValidationError, VersionMismatchError} from '../errors';

const handleResponse = async (response: Response) => {
    if (response.status === 0) {
        throw new ServerUnreachableError();
    } else if (response.status === 503) {
        throw new MaintenanceError(response, await response.text());
    } else if (response.status === 415) {
        throw new UnsupportedMediaTypeError(response, await response.text());
    } else if (response.status === 413) {
        throw new RequestEntityTooLargeError(response, await response.text());
    } else if (response.status === 401) {
        if (response.headers.get('content-type')?.includes('json')) {
            throw new UnauthorizedError(response, await response.json());
        }
        throw new UnauthorizedError(response, await response.text());
    } else if (!response.ok) {
        if (!response.headers.get('content-type')?.includes('json')) {
            throw new APIError(response, await response.text());
        }

        const data = await response.json() as ErrorResponse;

        if (response.status === 403 && data.errors?.[0]?.message === 'Authorization failed') {
            throw new UnauthorizedError(response, data);
        } else if (data.errors?.[0]?.type === 'VersionMismatchError') {
            throw new VersionMismatchError(response, data);
        } else if (data.errors?.[0]?.type === 'ValidationError') {
            throw new ValidationError(response, data);
        } else if (data.errors?.[0]?.type === 'NoPermissionError') {
            throw new ValidationError(response, data);
        } else if (data.errors?.[0]?.type === 'ThemeValidationError') {
            throw new ThemeValidationError(response, data);
        } else if (data.errors?.[0]?.type === 'HostLimitError') {
            throw new HostLimitError(response, data);
        } else if (data.errors?.[0]?.type === 'EmailError') {
            throw new EmailError(response, data);
        } else {
            throw new JSONError(response, data);
        }
    } else if (response.status === 204) {
        return;
    } else if (response.headers.get('content-type')?.includes('text/csv')) {
        return await response.text();
    } else {
        return await response.json();
    }
};

export default handleResponse;
