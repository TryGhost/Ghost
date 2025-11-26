import {getEnvironmentManager} from '@/helpers/environment';
import {test as setup} from '@playwright/test';

setup('global environment setup', async () => {
    const manager = await getEnvironmentManager();
    await manager.globalSetup();
});
