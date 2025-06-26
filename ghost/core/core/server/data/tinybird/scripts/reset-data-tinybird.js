#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable no-console */
/* eslint-disable ghost/ghost-custom/no-native-error */
/**
 * Reset Ghost Data & Generate Tinybird Analytics
 * 
 * This script:
 * 1. Clears the Ghost database
 * 2. Generates fresh Ghost data (members, posts)
 * 3. Uses that data to generate realistic Tinybird analytics events
 * 
 * Usage:
 *   node reset-data-tinybird.js [events_count]
 *   yarn reset:data:tinybird
 */

const {spawn} = require('child_process');
const path = require('path');
const chalk = require('chalk');

// Configuration
const DEFAULT_EVENTS_COUNT = 50000;
const GHOST_CORE_PATH = path.join(__dirname, '..', '..', '..', '..', '..');

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}]`;
    
    switch (type) {
    case 'success':
        console.log(chalk.green(`${prefix} ✅ ${message}`));
        break;
    case 'error':
        console.log(chalk.red(`${prefix} ❌ ${message}`));
        break;
    case 'warning':
        console.log(chalk.yellow(`${prefix} ⚠️  ${message}`));
        break;
    case 'step':
        console.log(chalk.blue(`${prefix} 🔄 ${message}`));
        break;
    default:
        console.log(chalk.gray(`${prefix} ℹ️  ${message}`));
    }
}

function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        log(`Running: ${command} ${args.join(' ')}`, 'step');
        
        const child = spawn(command, args, {
            stdio: 'inherit',
            cwd: options.cwd || process.cwd(),
            ...options
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`));
            }
        });

        child.on('error', (error) => {
            reject(error);
        });
    });
}

async function resetGhostData() {
    log('Clearing database and generating fresh Ghost data...', 'step');
    log('📊 Generating: 1000 members, 100 posts (seed: 123)', 'info');
    
    try {
        await runCommand('node', [
            'index.js',
            'generate-data',
            '--clear-database',
            '--quantities',
            'members:1000,posts:100',
            '--seed',
            '123'
        ], {
            cwd: GHOST_CORE_PATH
        });
        
        log('Ghost data generation completed successfully', 'success');
    } catch (error) {
        log(`Failed to generate Ghost data: ${error.message}`, 'error');
        throw error;
    }
}

async function generateTinybirdAnalytics(eventsCount) {
    log(`Generating ${eventsCount} Tinybird analytics events using fresh Ghost data...`, 'step');
    
    try {
        // First try with real database data - run from ghost/core where sqlite3 is properly installed
        await runCommand('node', [
            'core/server/data/tinybird/scripts/analytics-generator.js',
            eventsCount.toString()
        ], {
            cwd: GHOST_CORE_PATH
        });
        
        log('Tinybird analytics generation completed successfully', 'success');
    } catch (error) {
        log(`Database connection failed, trying with mock data...`, 'warning');
        
        try {
            // Fallback to mock data if database fails
            await runCommand('node', [
                'core/server/data/tinybird/scripts/analytics-generator.js',
                eventsCount.toString(),
                '--mock'
            ], {
                cwd: GHOST_CORE_PATH
            });
            
            log('Tinybird analytics generation completed with mock data', 'success');
        } catch (mockError) {
            log(`Failed to generate Tinybird analytics even with mock data: ${mockError.message}`, 'error');
            throw mockError;
        }
    }
}

async function main() {
    const eventsCount = parseInt(process.argv[2]) || DEFAULT_EVENTS_COUNT;
    
    console.log(chalk.bold('\n🚀 Ghost Data Reset & Tinybird Analytics Generator\n'));
    log(`Starting workflow with ${eventsCount} analytics events`, 'info');
    
    try {
        // Step 1: Reset Ghost data
        await resetGhostData();
        
        // Small delay to ensure database is ready
        log('Waiting for database to be ready...', 'info');
        await new Promise((resolve) => {
            setTimeout(resolve, 2000);
        });
        
        // Step 2: Generate Tinybird analytics
        await generateTinybirdAnalytics(eventsCount);
        
        // Success summary
        console.log(chalk.bold.green('\n🎉 Workflow completed successfully!\n'));
        log('Database has been reset with fresh Ghost data', 'success');
        log(`${eventsCount} analytics events generated in fixtures/analytics_events.ndjson`, 'success');
        log('You can now use this data for Tinybird development and testing', 'info');
    } catch (error) {
        console.log(chalk.bold.red('\n💥 Workflow failed!\n'));
        log(`Error: ${error.message}`, 'error');
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    log(`Uncaught exception: ${error.message}`, 'error');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled rejection at ${promise}: ${reason}`, 'error');
    process.exit(1);
});

// Run the main function
if (require.main === module) {
    main();
}

module.exports = {resetGhostData, generateTinybirdAnalytics}; 