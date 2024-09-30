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
    static getMessageFromError(error, defaultMessage, t) {

        function parseForTranslation(string, t = () => {return string}) {
            // create a regex that replaces any numbers with {number}
            const numberRegex = /\d+/;
            const match = string.match(numberRegex);
            if (match) {
                const matchedNumber = match[0];
                const subbedString = string.replace(numberRegex, '{{number}}');
                console.log('will call t with', subbedString, matchedNumber);
                return t(subbedString, {number: matchedNumber});
            } else {
                return t(string);
            }
            
        }
        console.log('message is',  error?.message)
        console.log('default is', defaultMessage);
        console.log('t is', t);
        if (error instanceof HumanReadableError) {
            return parseForTranslation(error.message, t);
        }
        return t(defaultMessage);
    }


}
