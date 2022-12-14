export class HumanReadableError extends Error {
    /**
     * Returns whether this response from the server is a human readable error and should be shown to the user.
     * @param {Response} res
     * @returns {HumanReadableError|undefined}
     */
    static async fromApiResponse(res) {
        // Bad request + Too many requests
        if (res.status === 400 || res.status === 429) {
            try {
                const json = await res.json();
                if (json.errors && Array.isArray(json.errors) && json.errors.length > 0 && json.errors[0].message) {
                    return new HumanReadableError(json.errors[0].message);
                }
            } catch (e) {
                // Failed to decode: ignore
                return false;
            }
        }
    }

    /**
     * Only output the message of an error if it is a human readable error and should be exposed to the user.
     * Otherwise it returns a default generic message.
     */
    static getMessageFromError(error, defaultMessage) {
        if (error instanceof HumanReadableError) {
            return error.message;
        }
        return defaultMessage;
    }
}
