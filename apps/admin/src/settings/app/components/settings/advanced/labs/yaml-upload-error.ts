import {JSONError} from '@tryghost/admin-x-framework/errors';

export interface YamlUploadError {
    /** One-line summary, safe to use as a toast title. */
    message: string;
    /** Underlying cause and remediation — often multi-line, so render it pre-wrapped. */
    detail?: string;
}

/**
 * Pull the operator-facing text out of a failed routes/redirects upload.
 *
 * These two endpoints are among the few whose `message` survives the API error
 * handler intact — `prepareUserMessage` only rewrites the message for methods
 * it can map to an action, and `upload` is not one of them. So `message` is the
 * specific thing the server wanted to say, `context` carries the underlying
 * cause (for a YAML error, the line and column), and `help` the next step. The
 * framework's generic handling keeps at most one of the three, so uploads
 * reported "Something went wrong while loading settings, please try again."
 * no matter what actually failed.
 *
 * Returns `null` when the failure carries no API error body — a transport
 * error, or the test harness's unmocked-request response — so the caller can
 * fall back to the framework's handling rather than inventing a message.
 */
export const getYamlUploadError = (error: unknown): YamlUploadError | null => {
    if (!(error instanceof JSONError) || !error.data?.errors?.[0]) {
        return null;
    }

    const {message, context, help} = error.data.errors[0];

    // `context` is documented as a string but a few validators put the offending
    // object there, which React refuses to render.
    const cause = typeof context === 'string' ? context.trim() : '';
    const nextStep = typeof help === 'string' ? help.trim() : '';
    const summary = message?.trim() || cause;

    if (!summary) {
        return null;
    }

    const detail = [
        // The summary often paraphrases the cause; only add it when it carries
        // something extra, which for a YAML error is the line and column.
        cause && cause !== summary && !summary.includes(cause) ? cause : '',
        nextStep
    ].filter(Boolean).join('\n\n');

    return {message: summary, detail: detail || undefined};
};
