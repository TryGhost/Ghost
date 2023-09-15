import {APIError, JSONError, ValidationError} from './errors';

const handleResponse = async (response: Response) => {
    if (response.status === 422) {
        const data = await response.json();

        if (data.errors?.[0]?.type === 'ValidationError') {
            throw new ValidationError(response, data);
        } else {
            throw new JSONError(response, data);
        }
    } else if (response.status > 299) {
        if (response.headers.get('content-type')?.includes('json')) {
            throw new JSONError(response, await response.json());
        } else {
            throw new APIError(response, await response.text());
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
