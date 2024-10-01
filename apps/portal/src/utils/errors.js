import {useContext} from 'react';
import AppContext from '../AppContext';

/**
 * A component that gets the internationalized (i18n) message from the app context.
 * @param {{message: string}} props - The props object containing the message to be translated.
 * @returns {string} The translated message if AppContext.t is available, otherwise the original message.
 */
export const GetMessage = ({message}) => {
    const {t} = useContext(AppContext);
    return t ? t(message) : message;
};

/**
 * Creates a human-readable error from an API response.
 * @param {Response} res - The API response object.
 * @returns {Promise<Error|undefined>} A promise that resolves to an Error if one can be created, or undefined otherwise.
 */
export async function getErrorFromApiResponse(res) {
    // Bad request + Too many requests
    if (res.status === 400 || res.status === 429) {
        try {
            const json = await res.json();
            if (json.errors && Array.isArray(json.errors) && json.errors.length > 0 && json.errors[0].message) {
                return new Error(<GetMessage message={json.errors[0].message} />);
            }
        } catch (e) {
            // Failed to decode: ignore
            return undefined;
        }
    }
    return undefined;
}

/**
 * Creates a human-readable error message from an error object.
 * @param {Error} error - The error object.
 * @param {string} defaultMessage - The default message to use if a human-readable message can't be extracted.
 * @returns {React.ReactElement} A React element containing the human-readable error message.
 */
export function getMessageFromError(error, defaultMessage) {
    if (defaultMessage) {
        return <GetMessage message={defaultMessage} />;
    } else if (error instanceof Error) {
        return <GetMessage message={error.message} />;
    }
    return <GetMessage message={error} />;
}
