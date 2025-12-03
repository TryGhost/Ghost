import {getEnvironmentManager} from '@/helpers/environment';
import {test as teardown} from '@playwright/test';

teardown('global environment cleanup', async () => {
    const manager = await getEnvironmentManager();
    await manager.globalTeardown();
});
