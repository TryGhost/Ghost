import {EnvironmentManager} from '../helpers/environment';
import {test as setup} from '@playwright/test';

setup('global environment setup', async () => {
    const environmentManager = new EnvironmentManager();
    await environmentManager.globalSetup();
});
