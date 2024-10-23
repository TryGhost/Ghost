const fs = require('fs');
const path = require('path');

if (process.env.CODESPACES === 'true') {
    const configFile = path.join(__dirname, '..', 'ghost', 'core', 'config.local.json');
    console.log(configFile);
    const config = {};
    if (!fs.existsSync(configFile)) {
        // url
        const url = `https://${process.env.CODESPACE_NAME}-2368.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
        config.url = url;
        // mail
        if (process.env.MAILGUN_SMTP_PASS && process.env.MAILGUN_SMTP_USER) {
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
    }
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}