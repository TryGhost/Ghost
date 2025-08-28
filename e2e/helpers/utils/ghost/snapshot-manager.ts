import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';

const SNAPSHOT_FILE = path.join(__dirname, '../../..', 'ghost-initialized.sql');
const DB_CONFIG = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'ghost_testing'
};

/**
 * Manages database snapshots for test isolation
 * 
 * This creates a snapshot after Ghost has fully initialized (migrations run, admin user created)
 * and can quickly restore it between tests
 */
export class SnapshotManager {
    /**
     * Create a snapshot of the current database state
     * Should be called after Ghost is fully initialized with migrations and admin user
     */
    static createSnapshot(): void {
        const dumpCommand = `mysqldump -h${DB_CONFIG.host} -P${DB_CONFIG.port} -u${DB_CONFIG.user} -p${DB_CONFIG.password} ${DB_CONFIG.database} --single-transaction --skip-routines --skip-triggers > ${SNAPSHOT_FILE}`;
        
        try {
            execSync(dumpCommand, {stdio: 'pipe'});
            const stats = fs.statSync(SNAPSHOT_FILE);
            // Only log if it's unusually large
            if (stats.size > 1024 * 1024) {
                console.warn(`⚠️ Large snapshot: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
            }
        } catch (error) {
            console.error('Failed to create snapshot:', error);
            throw error;
        }
    }
    
    /**
     * Restore database from snapshot
     * Much faster than running migrations from scratch
     */
    static restoreSnapshot(): void {
        if (!fs.existsSync(SNAPSHOT_FILE)) {
            throw new Error(`Snapshot file not found at ${SNAPSHOT_FILE}. Run createSnapshot() first.`);
        }
        
        // Drop and recreate database
        const resetCommand = `mysql -h${DB_CONFIG.host} -P${DB_CONFIG.port} -u${DB_CONFIG.user} -p${DB_CONFIG.password} -e "DROP DATABASE IF EXISTS ${DB_CONFIG.database}; CREATE DATABASE ${DB_CONFIG.database};"`;
        
        // Restore from snapshot
        const restoreCommand = `mysql -h${DB_CONFIG.host} -P${DB_CONFIG.port} -u${DB_CONFIG.user} -p${DB_CONFIG.password} ${DB_CONFIG.database} < ${SNAPSHOT_FILE}`;
        
        try {
            execSync(resetCommand, {stdio: 'pipe'});
            execSync(restoreCommand, {stdio: 'pipe'});
        } catch (error) {
            console.error('Failed to restore snapshot:', error);
            throw error;
        }
    }
    
    /**
     * Check if a snapshot exists
     */
    static hasSnapshot(): boolean {
        return fs.existsSync(SNAPSHOT_FILE);
    }
    
    /**
     * Delete the snapshot file
     */
    static deleteSnapshot(): void {
        if (fs.existsSync(SNAPSHOT_FILE)) {
            fs.unlinkSync(SNAPSHOT_FILE);
            console.log('🗑️ Snapshot deleted');
        }
    }
}