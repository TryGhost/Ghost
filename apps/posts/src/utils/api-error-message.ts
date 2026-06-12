import {JSONError} from '@tryghost/admin-x-framework/errors';

/** Extracts the API error message from a failed request, falling back to a generic message */
export function apiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof JSONError && error.data?.errors?.[0]?.message) {
        return error.data.errors[0].message;
    }
    return fallback;
}
