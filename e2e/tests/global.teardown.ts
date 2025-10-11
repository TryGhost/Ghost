import {test as teardown} from '@playwright/test';
import {EnvironmentManager} from '../helpers/environment';

teardown('global environment cleanup', async () => {
    const environmentManager = new EnvironmentManager();
    await environmentManager.globalTeardown();
});
