import { test as teardown } from '@playwright/test';
import { ContainerState } from './helpers/environment/ContainerState';
import { DockerManager } from './helpers/environment/DockerManager';
import debug from 'debug';

const log = debug('e2e:global-teardown');

teardown('global environment cleanup', async ({}) => {
    log('Starting global environment cleanup...');

    const containerState = new ContainerState();
    const dockerManager = new DockerManager();

    try {
        // Check if we have state to clean up
        const hasState = containerState.hasNetworkState() || containerState.hasMySQLState();
        
        if (!hasState) {
            log('No container state found, nothing to clean up');
            return;
        }

        let networkId: string | null = null;
        
        // Get network ID if available
        try {
            const networkState = containerState.loadNetworkState();
            networkId = networkState.networkId;
            log('Found network to clean up:', networkId);
        } catch (error) {
            log('Could not load network state:', error);
        }

        // If we have a network, perform comprehensive cleanup
        if (networkId) {
            log('Performing comprehensive network cleanup...');
            
            try {
                // This will:
                // 1. Find all containers on the network
                // 2. Stop and remove them (Ghost instances + MySQL)
                // 3. Remove the network
                await dockerManager.cleanupNetwork(networkId);
                log('Network cleanup completed successfully');
            } catch (error) {
                log('Network cleanup failed, attempting individual cleanup:', error);
                
                // Fallback: try to clean up MySQL container directly
                try {
                    const mysqlState = containerState.loadMySQLState();
                    await dockerManager.removeContainer(mysqlState.containerId);
                    log('MySQL container cleanup completed');
                } catch (mysqlError) {
                    log('MySQL container cleanup failed:', mysqlError);
                }

                // Try to remove network anyway
                try {
                    await dockerManager.removeNetwork(networkId);
                    log('Network removal completed');
                } catch (networkError) {
                    log('Network removal failed:', networkError);
                }
            }
        } else {
            // No network info, try to clean up MySQL directly
            try {
                const mysqlState = containerState.loadMySQLState();
                await dockerManager.removeContainer(mysqlState.containerId);
                log('MySQL container cleanup completed');
            } catch (error) {
                log('Could not clean up MySQL container:', error);
            }
        }

        // Clean up state files
        containerState.cleanupAll();
        log('State files cleaned up');

        log('Global environment cleanup completed successfully');

    } catch (error) {
        log('Global environment cleanup encountered errors:', error);
        
        // Still try to clean up state files even if container cleanup failed
        try {
            containerState.cleanupAll();
            log('State files cleaned up after error');
        } catch (stateCleanupError) {
            log('State file cleanup also failed:', stateCleanupError);
        }

        // Don't throw - we want teardown to complete even if there are issues
        // This prevents hanging test runs due to cleanup failures
    }
});