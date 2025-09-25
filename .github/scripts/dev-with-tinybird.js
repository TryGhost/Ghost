#!/usr/bin/env node

const {spawn, execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if analytics containers are running
function checkAnalyticsRunning() {
    try {
        const output = execSync('docker ps --format "{{.Names}}"', {encoding: 'utf8'});
        return output.includes('ghost-tinybird-local');
    } catch (error) {
        return false;
    }
}

// Extract Tinybird configuration from Docker volume
function extractTinybirdConfig() {
    try {
        console.log('📊 Extracting Tinybird configuration from Docker...');

        // Wait for tb-cli to complete if needed
        try {
            execSync('docker wait ghost-tb-cli', {encoding: 'utf8', stdio: 'pipe'});
        } catch (e) {
            // Container might have already completed
        }

        // Extract configuration from shared volume
        const config = execSync(
            'docker run --rm -v ghost_shared-config:/mnt/shared-config alpine cat /mnt/shared-config/.env.tinybird',
            {encoding: 'utf8', stdio: 'pipe'}
        );

        if (!config) {
            throw new Error('Could not read Tinybird configuration');
        }

        // Parse the configuration
        const lines = config.split('\n').filter(line => line.includes('='));
        const configObj = {};

        lines.forEach(line => {
            const [key, ...valueParts] = line.split('=');
            configObj[key] = valueParts.join('=');
        });

        if (!configObj.TINYBIRD_WORKSPACE_ID || !configObj.TINYBIRD_ADMIN_TOKEN) {
            throw new Error('Invalid Tinybird configuration');
        }

        return configObj;
    } catch (error) {
        console.error('❌ Failed to extract Tinybird configuration:', error.message);
        console.error('   Make sure Docker analytics containers are running properly');
        process.exit(1);
    }
}

// Setup Tinybird environment variables
function setupTinybirdEnv() {
    const config = extractTinybirdConfig();

    // Set environment variables for the child process
    const tinybirdEnv = {
        tinybird__workspaceId: config.TINYBIRD_WORKSPACE_ID,
        tinybird__adminToken: config.TINYBIRD_ADMIN_TOKEN,
        tinybird__stats__endpoint: 'http://localhost:7181',
        tinybird__stats__endpointBrowser: 'http://localhost:7181',
        tinybird__tracker__endpoint: 'http://localhost:3000/api/v1/page_hit',
        TINYBIRD_TRACKER_TOKEN: config.TINYBIRD_TRACKER_TOKEN
    };

    console.log('✅ Tinybird configuration loaded');
    return tinybirdEnv;
}

// Main function
async function main() {
    // Check if we should use Tinybird
    const useTinybird = process.argv.includes('--tinybird') || process.env.GHOST_USE_TINYBIRD === 'true';

    let extraEnv = {};

    if (useTinybird) {
        console.log('🚀 Starting Ghost with Tinybird analytics...\n');

        // Check if analytics containers are running
        if (!checkAnalyticsRunning()) {
            console.log('📦 Analytics containers not running, starting them...');
            try {
                execSync('docker compose --profile analytics up -d --wait', {
                    stdio: 'inherit'
                });
                console.log('✅ Analytics containers started\n');
            } catch (error) {
                console.error('❌ Failed to start analytics containers');
                process.exit(1);
            }
        } else {
            console.log('✅ Analytics containers already running\n');
        }

        // Setup Tinybird environment
        extraEnv = setupTinybirdEnv();
    }

    // Get the original dev script arguments
    const devScriptPath = path.join(__dirname, 'dev.js');
    const devArgs = process.argv.slice(2).filter(arg => arg !== '--tinybird');

    console.log('\n🏃 Starting Ghost development server...\n');

    // Spawn the original dev script with Tinybird environment
    const child = spawn('node', [devScriptPath, ...devArgs], {
        stdio: 'inherit',
        env: {
            ...process.env,
            ...extraEnv
        }
    });

    child.on('error', (error) => {
        console.error('Failed to start:', error);
        process.exit(1);
    });

    child.on('exit', (code) => {
        process.exit(code);
    });
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down...');
    process.exit(0);
});

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});