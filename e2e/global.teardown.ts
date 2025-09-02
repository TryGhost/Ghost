import {test as teardown} from '@playwright/test';
import {EnvironmentManager} from './helpers/environment';

teardown('global environment teardown', async ({}) => {
    // Get the environment manager instance from global state
    const environmentManager = (global as any).environmentManager as EnvironmentManager;
    
    if (environmentManager) {
        await environmentManager.teardown();
        delete (global as any).environmentManager;
    }
});