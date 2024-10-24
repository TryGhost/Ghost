const {spawn} = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const chalk = require('chalk');
const inquirer = require('inquirer');

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

    if (process.env.DEVCONTAINER === 'true') {
        console.log(chalk.yellow(`Devcontainer detected, skipping setup`));
        return;
    }

    const coreFolder = path.join(__dirname, '../../ghost/core');
    const rootFolder = path.join(__dirname, '../..');
    const config = require('../../ghost/core/core/shared/config/loader').loadNconf({
        customConfigPath: coreFolder
    });

    const dbClient = config.get('database:client');
    const isUsingDocker = config.get('database:docker');

    // Only reset data if we are using Docker
    let resetData = false;

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
            resetData = true;
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
                docker: true,
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
        }
    } else {
        if (isUsingDocker) {
            const yesAll = process.argv.includes('-y');
            const noAll = process.argv.includes('-n');
            const {confirmed} =
                yesAll ? {confirmed: true}
                : (
                    noAll ? {confirmed: false}
                    : await inquirer.prompt({name: 'confirmed', type:'confirm', message: 'MySQL is running via Docker, do you want to reset the Docker container? This will delete all existing data.', default: false})
                );

            if (confirmed) {
                console.log(chalk.yellow(`Resetting Docker container`));

                try {
                    await runAndStream('yarn', ['docker:reset'], {cwd: path.join(__dirname, '../../')});
                    resetData = true;
                } catch (err) {
                    console.error(chalk.red('Failed to run MySQL Docker container'), err);
                    console.error(chalk.red('Hint: is Docker installed and running?'));
                }
            }
        } else {
            console.log(chalk.green(`MySQL already configured locally. Stop your local database and delete your "database" configuration in config.local.json to switch to Docker.`));
        }
    }

    console.log(chalk.blue(`Running knex-migrator init`));
    await runAndStream('yarn', ['knex-migrator', 'init'], {cwd: coreFolder});
    if (process.argv.includes('--no-seed')) {
        console.log(chalk.yellow(`Skipping seed data`));
        console.log(chalk.yellow(`Done`));
        return;
    }
    if (resetData) {
        const xxl = process.argv.includes('--xxl');

        if (xxl) {
            console.log(chalk.blue(`Resetting all data (with xxl)`));
            await runAndStream('yarn', ['reset:data:xxl'], {cwd: rootFolder});
        } else {
            console.log(chalk.blue(`Resetting all data`));
            await runAndStream('yarn', ['reset:data'], {cwd: rootFolder});
        }
    }
})();
