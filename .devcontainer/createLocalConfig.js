const fs = require('fs');
const path = require('path');

// Reads the config.local.json file and updates it with environments variables for devcontainer setup
const configBasePath = path.join(__dirname, '..', 'ghost', 'core');
const configFile = path.join(configBasePath, 'config.local.json');
let config;
if (fs.existsSync(configFile)) {
    try {
        // Backup the user's config.local.json file just in case
        // This won't be used by Ghost but can be useful to switch back to local development
        const backupFile = path.join(configBasePath, 'config.local-backup.json');
        fs.copyFileSync(configFile, backupFile);

        // Read the current config.local.json file into memory
        const fileContent = fs.readFileSync(configFile, 'utf8');
        config = JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading or parsing config file:', error);
        process.exit(1);
    }
} else {
    console.log('Config file does not exist. Creating a new one.');
}

// Change the url if we're in a codespace
if (process.env.CODESPACES === 'true') {
    const url = `https://${process.env.CODESPACE_NAME}-2368.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
    config.url = url;
}

// Update the database connection settings
const databaseConfig = {
    client: 'mysql2',
    connection: {
        host: 'mysql',
        user: 'root',
        password: 'root',
        database: 'ghost'
    }
}
// Merge the original database config with the new database config
config.database = {...config.database, ...databaseConfig};

// Update the Redis connection settings
const redisConfig = {
    host: 'redis',
    port: 6379
}
config.adapters.Redis = redisConfig;


// Only update the mail settings if they aren't already set
if (!config.mail &&process.env.MAILGUN_SMTP_PASS && process.env.MAILGUN_SMTP_USER) {
    config.mail = {
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
if (!config.bulkEmail && process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    config.bulkEmail = {
        mailgun: {
            baseUrl: 'https://api.mailgun.net/v3',
            apiKey: process.env.MAILGUN_API_KEY,
            domain: process.env.MAILGUN_DOMAIN,
            tag: 'bulk-email'
        }
    }
}

// Write the updated config.local.json file
fs.writeFileSync(configFile, JSON.stringify(config, null, 2));