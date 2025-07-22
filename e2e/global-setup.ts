import {setupTestFactory} from './data-factory/setup';

async function globalSetup() {  
    // Initialize the test factory with Ghost boot check
    await setupTestFactory({waitForGhostBoot: true});
}

export default globalSetup;