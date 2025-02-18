const path = require('path');
const fs = require('fs').promises;

/**
 * Adjust config.local.json for Docker Compose setup
 */
async function adjustConfig() {
    console.log('Adjusting local configuration...');
    const coreFolder = path.join(__dirname, '../../ghost/core');
    const currentConfigPath = path.join(coreFolder, 'config.local.json');
    let currentConfig;
    try {
        currentConfig = require(currentConfigPath);
    } catch (err) {
        currentConfig = {};
    }

    currentConfig.database = {
        client: 'mysql',
        docker: true,
        connection: {
            host: 'mysql',
            user: 'root',
            password: 'root',
            database: 'ghost'
        }
    };

    currentConfig.adapters = {
        ...currentConfig.adapters,
        Redis: {
            host: 'redis',
            port: 6379
        }
    };

    currentConfig.server = {
        ...currentConfig.server,
        host: '0.0.0.0',
        port: 2368
    };

    try {
        await fs.writeFile(currentConfigPath, JSON.stringify(currentConfig, null, 4));
        console.log('Local configuration adjusted successfully');
    } catch (err) {
        console.error('Failed to write config.local.json', err);
        console.log(`Please add the following to config.local.json:\n`, JSON.stringify(currentConfig, null, 4));
        process.exit(1);
    }
}

(async () => {
    await adjustConfig();
})();
