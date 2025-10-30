import {EnvironmentManager} from '../helpers/environment';
import {test as teardown} from '@playwright/test';

teardown('global environment cleanup', async () => {
    const environmentManager = new EnvironmentManager();
    await environmentManager.globalTeardown();
});
