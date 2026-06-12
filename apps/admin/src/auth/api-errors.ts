import { APIError, JSONError } from "@tryghost/admin-x-framework/errors";

export type ApiErrorDetails = {
    code: string;
    context: string | null;
    message: string;
    type: string;
};

/** Returns the first JSON API error from a thrown request error, if any. */
export function getFirstApiError(error: unknown): ApiErrorDetails | null {
    if (error instanceof JSONError && error.data?.errors?.[0]) {
        return error.data.errors[0];
    }

    return null;
}

/**
 * Session creation rejects with a 403 when the password was correct but email
 * verification is still required. Returns the 2FA error code when that is the
 * case, null otherwise.
 */
export function getTwoFactorErrorCode(error: unknown): string | null {
    const firstError = getFirstApiError(error);

    if (firstError && ["2FA_TOKEN_REQUIRED", "2FA_NEW_DEVICE_DETECTED"].includes(firstError.code)) {
        return firstError.code;
    }

    return null;
}

export function isUnauthorizedError(error: unknown): boolean {
    return error instanceof APIError && error.response?.status === 401;
}
