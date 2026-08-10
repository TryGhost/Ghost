import {isTestEnv} from '../../test/utils/isTestEnv';

export const klipyConfig = isTestEnv ? {apiKey: 'xxx'} : getKlipyConfig();

function getKlipyConfig() {
    let config = null;

    if (import.meta.env.VITE_KLIPY_API_KEY) {
        config = {
            // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
            apiKey: import.meta.env.VITE_KLIPY_API_KEY
        };
    }

    return config;
}
