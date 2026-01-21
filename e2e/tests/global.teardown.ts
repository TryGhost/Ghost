import {getProvider} from '@/helpers/environment';
import {test as teardown} from '@playwright/test';

teardown('global environment cleanup', async () => {
    const provider = getProvider();
    await provider.globalTeardown();
});
