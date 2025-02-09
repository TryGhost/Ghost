const path = require('path');
const fs = require('fs').promises;
const {spawn} = require('child_process');

/**
 * Run a command and stream output to the console
 *
 * @param {string} command
 * @param {string[]} args
 * @param {object} options
 */
async function runAndStream(command, args, options) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: 'inherit',
            ...options
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(code);
            } else {
                reject(new Error(`'${command} ${args.join(' ')}' exited with code ${code}`));
            }
        });

    });
}

/**
 * Removes node dependencies and cleans up local caches
 */
function clean() {
    require('./clean');
}

/**
 * Adjust config.local.json for Docker Compose setup
 */
async function adjustConfig() {
    console.log('Adjusting configuration...');
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
    } catch (err) {
        console.error('Failed to write config.local.json', err);
        console.log(`Please add the following to config.local.json:\n`, JSON.stringify(currentConfig, null, 4));
        process.exit(1);
    }
}

async function buildContainer() {
    console.log('Building container...');
    await runAndStream('docker-compose', ['build'], {});
}

async function runMigrations() {
    console.log('Running migrations...');
    await runAndStream('docker-compose', ['run', '--rm', '-w', '/home/ghost/ghost/core', 'ghost', 'yarn', 'knex-migrator', 'init'], {cwd: path.join(__dirname, '../../')});
}

(async () => {
    clean();
    await adjustConfig();
    await buildContainer();
    await runMigrations();
})();
