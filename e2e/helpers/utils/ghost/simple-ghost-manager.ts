import {spawn, execSync} from 'child_process';
import {APIRequestContext} from '@playwright/test';
import * as path from 'path';
import {setupUser} from '../setup-user';
import {appConfig} from '../app-config';
import {SnapshotManager} from './snapshot-manager';

const GHOST_DIR = path.resolve(__dirname, '../../../../ghost/core');
const GHOST_PORT = process.env.GHOST_PORT || '2368';
const GHOST_URL = `http://localhost:${GHOST_PORT}`;

/**
 * Simplified Ghost Manager for E2E Tests
 * 
 * Uses database snapshots for fast test isolation:
 * 1. Start Ghost once and create a snapshot after initialization
 * 2. For each test: restore snapshot and restart Ghost
 * 3. This is much faster than running migrations each time
 */

export class SimpleGhostManager {
    /**
     * Kill any process on the Ghost port
     */
    static async killGhostProcess(): Promise<void> {
        try {
            // Use pkill instead of lsof to avoid hanging
            execSync(`pkill -f "node.*index.js"`, {stdio: 'ignore'});
            // Only wait if we actually killed something
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            // No process found - no need to wait
        }
    }
    
    /**
     * Start Ghost process
     */
    static async startGhost(): Promise<void> {
        // Make sure port is free
        await this.killGhostProcess();
        
        // Start Ghost in background
        const ghostProcess = spawn('node', ['--import=tsx', 'index.js'], {
            cwd: GHOST_DIR,
            env: {
                ...process.env,
                NODE_ENV: 'testing',
                server__testmode: 'true',
                server__port: GHOST_PORT,
                server__host: '127.0.0.1',
                database__client: 'mysql2',
                database__connection__host: '127.0.0.1',
                database__connection__port: '3306',
                database__connection__user: 'root',
                database__connection__password: 'root',
                database__connection__database: 'ghost_testing'
            },
            detached: true,
            stdio: 'ignore'
        });
        
        // Detach from parent process
        ghostProcess.unref();
        
        // Wait for Ghost to be ready
        await this.waitForGhost();
    }
    
    /**
     * Wait for Ghost to be fully ready
     */
    static async waitForGhost(): Promise<void> {
        const maxAttempts = 40;
        const checkInterval = 250; // Check more frequently
        
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch(GHOST_URL);
                if (response.ok) {
                    // Ghost is ready when it returns 200
                    return;
                }
            } catch (error) {
                // Not ready yet
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        throw new Error('Ghost failed to start within 10 seconds');
    }
    
    /**
     * Reset database - uses snapshot if available, otherwise clean slate
     */
    static async resetDatabase(): Promise<void> {
        if (SnapshotManager.hasSnapshot()) {
            // Fast path: restore from snapshot
            SnapshotManager.restoreSnapshot();
        } else {
            // Slow path: clean database (will need migrations)
            console.log('No snapshot available, creating clean database...');
            try {
                execSync(`mysql -h127.0.0.1 -P3306 -uroot -proot -e "DROP DATABASE IF EXISTS ghost_testing; CREATE DATABASE ghost_testing;"`, {
                    stdio: 'ignore'
                });
                console.log('Database reset complete');
            } catch (error) {
                console.error('Database reset failed:', error);
                throw error;
            }
        }
    }
    
    /**
     * Initialize Ghost and create snapshot for fast resets
     */
    static async initializeAndSnapshot(): Promise<void> {
        console.log('Initializing Ghost with fresh database...');
        const startTime = Date.now();
        
        // 1. Kill any existing process first
        await this.killGhostProcess();
        
        // 2. Clean database
        try {
            execSync(`mysql -h127.0.0.1 -P3306 -uroot -proot -e "DROP DATABASE IF EXISTS ghost_testing; CREATE DATABASE ghost_testing;"`, {
                stdio: 'ignore'
            });
        } catch (error) {
            console.error('Database reset failed:', error);
            throw error;
        }
        
        // 3. Start Ghost (will run migrations)
        await this.startGhost();
        
        // 4. Create admin user
        await setupUser(GHOST_URL, {
            email: appConfig.auth.email,
            password: appConfig.auth.password
        });
        
        // 5. Create snapshot for fast future resets
        SnapshotManager.createSnapshot();
        
        console.log(`✅ Ghost initialized in ${Date.now() - startTime}ms`);
    }
    
    /**
     * Complete reset for test using snapshot
     */
    static async resetForTest(request?: APIRequestContext): Promise<void> {
        const startTime = Date.now();
        
        // 1. Kill Ghost
        await this.killGhostProcess();
        
        // 2. Reset database from snapshot (fast!)
        await this.resetDatabase();
        
        // 3. Start Ghost (no migrations needed with snapshot)
        await this.startGhost();
        
        const elapsed = Date.now() - startTime;
        if (elapsed > 5000) {
            console.warn(`⚠️ Slow reset: ${elapsed}ms`);
        }
    }
}

// Export convenience functions
export async function startGhostForTests(): Promise<void> {
    await SimpleGhostManager.startGhost();
}

export async function stopGhostAfterTests(): Promise<void> {
    await SimpleGhostManager.killGhostProcess();
}

export async function resetGhostForTest(request?: APIRequestContext): Promise<void> {
    await SimpleGhostManager.resetForTest(request);
}