const {spawn} = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const chalk = require('chalk');

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

(async () => {
    if (process.env.NODE_ENV !== 'development') {
        console.log(chalk.yellow(`NODE_ENV is not development, skipping setup`));
        return;
    }

    const coreFolder = path.join(__dirname, '../../ghost/core');
    const config = require('../../ghost/core/core/shared/config/loader').loadNconf({
        customConfigPath: coreFolder
    });

    const dbClient = config.get('database:client');

    if (!dbClient.includes('mysql')) {
        let mysqlSetup = false;
        console.log(chalk.blue(`Attempting to setup MySQL via Docker`));
        try {
            await runAndStream('yarn', ['docker:reset'], {cwd: path.join(__dirname, '../../')});
            mysqlSetup = true;
        } catch (err) {
            console.error(chalk.red('Failed to run MySQL Docker container'), err);
            console.error(chalk.red('Hint: is Docker installed and running?'));
        }

        if (mysqlSetup) {
            console.log(chalk.blue(`Adding MySQL credentials to config.local.json`));
            const currentConfigPath = path.join(coreFolder, 'config.local.json');

            let currentConfig;
            try {
                currentConfig = require(currentConfigPath);
            } catch (err) {
                currentConfig = {};
            }

            currentConfig.database = {
                client: 'mysql',
                connection: {
                    host: '127.0.0.1',
                    user: 'root',
                    password: 'root',
                    database: 'ghost'
                }
            };

            try {
                await fs.writeFile(currentConfigPath, JSON.stringify(currentConfig, null, 4));
            } catch (err) {
                console.error(chalk.red('Failed to write config.local.json'), err);
                console.log(chalk.yellow(`Please add the following to config.local.json:\n`), JSON.stringify(currentConfig, null, 4));
                process.exit(1);
            }

            console.log(chalk.blue(`Running knex-migrator init`));
            await runAndStream('yarn', ['knex-migrator', 'init'], {cwd: coreFolder});

            //console.log(chalk.blue(`Running data generator`));
            //await runAndStream('node', ['index.js', 'generate-data'], {cwd: coreFolder});
        }
    } else {
        console.log(chalk.green(`MySQL already configured, skipping setup`));
    }
})();
