import {getProvider} from '@/helpers/environment';
import {test as setup} from '@playwright/test';

const TIMEOUT = 2 * 60 * 1000; // 2 minutes

setup('global environment setup', async () => {
    setup.setTimeout(TIMEOUT);
    const provider = getProvider();
    await provider.globalSetup();
});
