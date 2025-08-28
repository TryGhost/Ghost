import {stopGhostAfterTests} from './utils/ghost/simple-ghost-manager';

/**
 * Global teardown for isolated tests
 * Runs once after all tests complete
 */
export default async function globalTeardown() {
    try {
        await stopGhostAfterTests();
    } catch (error) {
        // Don't throw - we want cleanup to complete even if stopping fails
    }
}