import {SimpleGhostManager} from './utils/ghost/simple-ghost-manager';
import {SnapshotManager} from './utils/ghost/snapshot-manager';

/**
 * Global setup for isolated tests
 * Runs once before all tests
 * Creates a database snapshot after initialization for fast resets
 */
export default async function globalSetup() {
    const startTime = Date.now();
    
    try {
        // Check if we already have a snapshot
        if (!SnapshotManager.hasSnapshot()) {
            await SimpleGhostManager.initializeAndSnapshot();
        } else {
            // Just restore and start
            await SimpleGhostManager.resetDatabase();
            await SimpleGhostManager.startGhost();
        }
        
        const elapsed = Date.now() - startTime;
        console.log(`Ghost ready in ${elapsed}ms`);
    } catch (error) {
        console.error('Failed to setup Ghost:', error);
        throw error;
    }
}