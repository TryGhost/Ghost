// This script is run in the Dev Container right after it is created
// No dependencies are installed at this point so we can't use any npm packages
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');

// Main function that runs all the setup steps
function main() {
    setupGitRemotes();
    setupLocalConfig();
    runCleanHard();
    runInstall();
    runSubmoduleUpdate();
    runTypescriptBuild();
}

// Basic color constants for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logError(message, error) {
    console.error(`${colors.red}${message}${colors.reset}`, error);
}

// Sets up the git remotes for the dev container based on environment variables
function setupGitRemotes() {
    log('Configuring git remotes...', colors.blue);
    try {
        const GHOST_UPSTREAM = process.env.GHOST_UPSTREAM;
        const GHOST_FORK_REMOTE_URL = process.env.GHOST_FORK_REMOTE_URL;
        const GHOST_FORK_REMOTE_NAME = process.env.GHOST_FORK_REMOTE_NAME;
        const GHOST_FORCE_SSH = process.env.GHOST_FORCE_SSH;
        let remotes = execSync('git remote').toString().trim().split('\n');

        if (GHOST_UPSTREAM) {
            // Check if the upstream remote already exists
            if (!remotes.includes(GHOST_UPSTREAM) && remotes.includes('origin')) {
                log(`Renaming the default remote from origin to ${GHOST_UPSTREAM}...`, colors.blue);
                execSync(`git remote rename origin ${GHOST_UPSTREAM}`);
            }
        }

        remotes = execSync('git remote').toString().trim().split('\n');
        if (GHOST_FORK_REMOTE_URL) {
            const remoteName = GHOST_FORK_REMOTE_NAME || 'origin';
            // Check if the fork remote already exists
            if (!remotes.includes(remoteName)) {
                log(`Adding fork remote ${GHOST_FORK_REMOTE_URL} as ${remoteName}...`, colors.blue);
                execSync(`git remote add ${remoteName} ${GHOST_FORK_REMOTE_URL}`);
            }
        }

        if (GHOST_FORCE_SSH) {
            log('Forcing SSH for all remotes...', colors.blue);
            // Get all remotes
            remotes = execSync('git remote').toString().trim().split('\n');
            
            for (const remote of remotes) {
                // Get the current URL for this remote
                const url = execSync(`git remote get-url ${remote}`).toString().trim();
                
                // Only convert if it's an HTTPS URL
                if (url.startsWith('https://')) {
                    // Convert HTTPS to SSH format
                    // https://github.com/user/repo.git -> git@github.com:user/repo.git
                    const sshUrl = url
                        .replace(/^https:\/\//, 'git@')
                        .replace(/\//, ':');
                    
                    log(`Converting ${remote} from HTTPS to SSH...`, colors.dim);
                    execSync(`git remote set-url ${remote} ${sshUrl}`);
                }
            }
        }

    } catch (error) {
        logError('Error setting up git remotes:', error);
    }
}

// Creates config.local.json file with the correct values for the devcontainer
function setupLocalConfig() {
    log('Setting up local config file...', colors.blue);
    // Reads the config.local.json file and updates it with environments variables for devcontainer setup
    const configBasePath = path.join(__dirname, '..', 'ghost', 'core');
    const configFile = path.join(configBasePath, 'config.local.json');
    let originalConfig = {};
    if (fs.existsSync(configFile)) {
        try {
            // Backup the user's config.local.json file just in case
            // This won't be used by Ghost but can be useful to switch back to local development
            const backupFile = path.join(configBasePath, 'config.local-backup.json');
            fs.copyFileSync(configFile, backupFile);

            // Read the current config.local.json file into memory
            const fileContent = fs.readFileSync(configFile, 'utf8');
            originalConfig = JSON.parse(fileContent);
        } catch (error) {
            logError('Error reading or parsing config file:', error);
            process.exit(1);
        }
    } else {
        log('Config file does not exist. Creating a new one.', colors.dim);
    }

    let newConfig = {};
    // Change the url if we're in a codespace
    if (process.env.CODESPACES === 'true') {
        assert.ok(process.env.CODESPACE_NAME, 'CODESPACE_NAME is not defined');
        assert.ok(process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN, 'GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN is not defined');
        const url = `https://${process.env.CODESPACE_NAME}-2368.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
        newConfig.url = url;
    }

    newConfig.database = {
        client: 'mysql2',
        connection: {
            host: 'mysql',
            user: 'root',
            password: 'root',
            database: 'ghost'
        }
    }
    newConfig.adapters = {
        Redis: {
            host: 'redis',
            port: 6379
        }
    }

    // Only update the mail settings if they aren't already set
    if (!originalConfig.mail && process.env.MAILGUN_SMTP_PASS && process.env.MAILGUN_SMTP_USER && process.env.MAILGUN_FROM_ADDRESS) {
        newConfig.mail = {
            transport: 'SMTP',
            from: process.env.MAILGUN_FROM_ADDRESS,
            options: {
                service: 'Mailgun',
                host: 'smtp.mailgun.org',
                secure: true,
                port: 465,
                auth: {
                    user: process.env.MAILGUN_SMTP_USER,
                    pass: process.env.MAILGUN_SMTP_PASS
                }
            }
        }
    }

    // Only update the bulk email settings if they aren't already set
    if (!originalConfig.bulkEmail && process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
        newConfig.bulkEmail = {
            mailgun: {
                baseUrl: 'https://api.mailgun.net/v3',
                apiKey: process.env.MAILGUN_API_KEY,
                domain: process.env.MAILGUN_DOMAIN,
                tag: 'bulk-email'
            }
        }
    }

    // Merge the original config with the new config
    const config = {...originalConfig, ...newConfig};

    // Write the updated config.local.json file
    try {
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        log('Config file updated successfully.', colors.dim);
    } catch (error) {
        logError('Error writing config file:', error);
        process.exit(1);
    }
}

// Deletes node_modules and clears yarn & nx caches
function runCleanHard() {
    try {
        log('Cleaning up node_modules and yarn/nx caches...', colors.blue);
        execSync('yarn clean:hard', { stdio: 'inherit' });
        log('Successfully ran yarn clean:hard', colors.dim);
    } catch (error) {
        logError('Error running yarn clean:hard:', error);
        process.exit(1);
    }
}

// Installs dependencies
function runInstall() {
    try {
        log('Installing dependencies...', colors.blue);
        execSync('yarn install --frozen-lockfile', { stdio: 'inherit' });
        log('Successfully ran yarn install', colors.dim);
    } catch (error) {
        logError('Error running yarn install:', error);
        process.exit(1);
    }
}

// Initializes and updates git submodules
function runSubmoduleUpdate() {
    try {
        log('Updating git submodules...', colors.blue);
        execSync('git submodule update --init --recursive', { stdio: 'inherit' });
        // Rename the default remote to $GHOST_UPSTREAM if it's set
        // Otherwise `yarn main:submodules` will fail
        const GHOST_UPSTREAM = process.env.GHOST_UPSTREAM;
        if (GHOST_UPSTREAM) {
            execSync(`git submodule foreach "git remote | grep -q '^${GHOST_UPSTREAM}$' || (git remote | grep -q '^origin$' && git remote rename origin ${GHOST_UPSTREAM})"`);
        }

        log('Successfully ran git submodule update', colors.dim);
    } catch (error) {
        logError('Error running git submodule update:', error);
        process.exit(1);
    }
}

// Builds the typescript packages
function runTypescriptBuild() {
    try {
        log('Building typescript packages...', colors.blue);
        execSync('yarn nx run-many -t build:ts', { stdio: 'inherit' });
        log('Successfully ran yarn nx run-many -t build:ts', colors.dim);
    } catch (error) {
        logError('Error running yarn nx run-many -t build:ts:', error);
        process.exit(1);
    }
}

main();