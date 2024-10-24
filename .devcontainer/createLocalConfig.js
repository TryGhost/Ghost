const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

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
        console.error('Error reading or parsing config file:', error);
        process.exit(1);
    }
} else {
    console.log('Config file does not exist. Creating a new one.');
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
if (!originalConfig.mail && process.env.MAILGUN_SMTP_PASS && process.env.MAILGUN_SMTP_USER) {
    newConfig.mail = {
        transport: 'SMTP',
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
    console.log('Config file updated successfully.');
} catch (error) {
    console.error('Error writing config file:', error);
    process.exit(1);
}