import {isTestEnv} from '../../test/utils/isTestEnv';

export const tenorConfig = isTestEnv ? {googleApiKey: 'xxx'} : getTenorConfig();

// In tests the GIF provider defaults to Tenor; the ?gifProvider=klipy query
// param opts a specific test into the Klipy path.
export const klipyConfig = isTestEnv ? getTestKlipyConfig() : getKlipyConfig();

function getTenorConfig() {
    let config = null;

    if (import.meta.env.VITE_TENOR_API_KEY) {
        config = {
            googleApiKey: import.meta.env.VITE_TENOR_API_KEY
        };
    }

    return config;
}

function getKlipyConfig() {
    let config = null;

    if (import.meta.env.VITE_KLIPY_API_KEY) {
        config = {
            apiKey: import.meta.env.VITE_KLIPY_API_KEY
        };
    }

    return config;
}

function getTestKlipyConfig() {
    const provider = new URLSearchParams(window.location.search).get('gifProvider');
    return provider === 'klipy' ? {apiKey: 'xxx'} : null;
}
