import {ERROR_TYPE} from '../../../../utils/services/gif.js';

export function Error({error}) {
    if (error === ERROR_TYPE.COMMON) {
        return (
            <p>
                Uh-oh! Trouble reaching the GIF service, please check your connection
            </p>
        );
    }

    if (error === ERROR_TYPE.INVALID_API_KEY) {
        return (
            <p>
                The GIF API key is not valid. Please check your configuration by following our
                <a href="https://ghost.org/docs/config/" rel="noopener noreferrer" target="_blank"> documentation here</a>.
            </p>
        );
    }
    return (
        <p>{error}</p>
    );
}
