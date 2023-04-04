import {isTestEnv} from '../../test/utils/isTestEnv';

export const tenorConfig = isTestEnv ? {googleApiKey: 'xxx'} : getTenorConfig();

function getTenorConfig() {
    let config = null;

    if (import.meta.env.VITE_TENOR_API_KEY) {
        config = {
            googleApiKey: import.meta.env.VITE_TENOR_API_KEY
        };
    }

    return config;
}
