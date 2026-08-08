import {APIError, JSONError} from '@tryghost/admin-x-framework/errors';

const GENERIC_MESSAGE = 'Something went wrong, please try again.';

/**
 * Pull the operator-facing text out of a failed routes/redirects upload.
 *
 * These two endpoints are among the few whose `message` survives the API error
 * handler intact — `prepareUserMessage` only rewrites the message for methods
 * it can map to an action, and `upload` is not one of them. So the message is
 * the specific thing the server wanted to say ("Could not save routes.yaml to
 * storage: AccessDenied (PutObject)."), not a generic summary, and `help`
 * carries the next step. Both are dropped by the framework's default handling,
 * which assumes the generic shape.
 */
export const extractYamlUploadError = (error: unknown): string => {
    if (error instanceof JSONError && error.data?.errors?.[0]) {
        const {message, context, help} = error.data.errors[0];
        const parts = [message || context, help].filter(Boolean);

        if (parts.length) {
            return parts.join(' ');
        }
    }

    if (error instanceof APIError && error.message) {
        return error.message;
    }

    return GENERIC_MESSAGE;
};
