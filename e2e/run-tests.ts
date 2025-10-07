#!/usr/bin/env tsx

import {spawn} from 'child_process';
import {EnvironmentManager} from './helpers/environment';
import logging from '@tryghost/logging';
import baseDebug from '@tryghost/debug';

const debug = baseDebug('e2e:run-tests');

/**
 * Test wrapper script that ensures globalTeardown always runs,
 * even when tests are interrupted with Ctrl+C (SIGINT).
 *
 * This script:
 * 1. Registers signal handlers (SIGINT, SIGTERM, SIGHUP)
 * 2. Spawns Playwright as a child process
 * 3. On interrupt: runs cleanup, kills Playwright, exits
 * 4. On normal exit: forwards Playwright's exit code
 */

let cleanupInProgress = false;
let playwrightProcess: ReturnType<typeof spawn> | null = null;

/**
 * Run cleanup exactly once
 */
async function runCleanup(signal?: string): Promise<void> {
    if (cleanupInProgress) {
        return;
    }
    cleanupInProgress = true;

    if (signal) {
        logging.info(`Received ${signal}, running cleanup...`);
    }

    try {
        const environmentManager = new EnvironmentManager();
        await environmentManager.globalTeardown();
        logging.info('Cleanup completed successfully');
    } catch (error) {
        logging.error('Cleanup failed:', error);
        // Don't throw - we still want to exit gracefully
    }
}

/**
 * Handle signals by cleaning up and exiting
 */
async function handleSignal(signal: string): Promise<void> {
    logging.info(`\nTest run interrupted by ${signal}`);

    // Kill Playwright child process if running
    if (playwrightProcess && !playwrightProcess.killed) {
        logging.info('Stopping Playwright...');
        playwrightProcess.kill('SIGTERM');
    }

    // Run cleanup
    await runCleanup(signal);

    // Exit with appropriate code (128 + signal number is convention)
    const exitCode = signal === 'SIGINT' ? 130 : 143;
    process.exit(exitCode);
}

/**
 * Register signal handlers
 */
function registerSignalHandlers(): void {
    // Handle Ctrl+C
    process.on('SIGINT', () => handleSignal('SIGINT'));

    // Handle kill command
    process.on('SIGTERM', () => handleSignal('SIGTERM'));

    // Handle terminal hangup
    process.on('SIGHUP', () => handleSignal('SIGHUP'));
}

/**
 * Main function: spawn Playwright and handle its lifecycle
 */
async function main(): Promise<void> {
    // Register signal handlers before starting Playwright
    registerSignalHandlers();

    // Get CLI arguments (everything after 'tsx run-tests.ts')
    const args = process.argv.slice(2);

    // Spawn Playwright as child process
    logging.info('Starting Playwright tests...');
    playwrightProcess = spawn('npx', ['playwright', 'test', ...args], {
        stdio: 'inherit', // Forward stdout/stderr to parent
        env: process.env
    });

    // Wait for Playwright to exit
    playwrightProcess.on('exit', (code, signal) => {
        // If cleanup is in progress, don't exit yet - let the signal handler finish
        if (cleanupInProgress) {
            debug('Playwright exited while cleanup is in progress, waiting for cleanup to complete...');
            return;
        }

        if (signal) {
            logging.info(`Playwright was killed with signal ${signal}`);
            process.exit(1);
        } else {
            logging.info(`Playwright exited with code ${code || 0}`);
            // Exit with same code as Playwright
            // Note: Don't call runCleanup here - global.teardown.ts will handle it
            process.exit(code || 0);
        }
    });

    playwrightProcess.on('error', (error) => {
        logging.error('Failed to start Playwright:', error);
        process.exit(1);
    });
}

// Run main function
main().catch((error) => {
    logging.error('Unexpected error:', error);
    process.exit(1);
});
