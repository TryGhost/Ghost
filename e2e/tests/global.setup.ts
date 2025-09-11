import {test as setup} from '@playwright/test';
import {EnvironmentManager} from '../helpers/environment';

setup('global environment setup', async () => {
    const environmentManager = new EnvironmentManager();
    await environmentManager.globalSetup();
});
