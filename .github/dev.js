const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const concurrently = require('concurrently');

const config = require('../ghost/core/core/shared/config/loader').loadNconf({
    customConfigPath: path.join(__dirname, '../ghost/core')
});

const liveReloadBaseUrl = config.getSubdir() || '/ghost/';
const siteUrl = config.getSiteUrl();

const DASH_DASH_ARGS = process.argv.filter(a => a.startsWith('--')).map(a => a.slice(2));

let commands = [];

const COMMAND_GHOST = {
    name: 'ghost',
    command: 'yarn nodemon -q -i ghost/admin -i ghost/core/content -i ghost/core/core/built -i ghost/portal',
    prefixColor: 'blue',
    env: {}
};

const COMMAND_ADMIN = {
    name: 'admin',
    command: `yarn start --live-reload-base-url=${liveReloadBaseUrl} --live-reload-port=4201`,
    cwd: path.resolve(__dirname, '../ghost/admin'),
    prefixColor: 'green',
    env: {}
};

if (DASH_DASH_ARGS.includes('ghost')) {
    commands = [COMMAND_GHOST];
} else if (DASH_DASH_ARGS.includes('admin')) {
    commands = [COMMAND_ADMIN];
} else {
    commands = [COMMAND_GHOST, COMMAND_ADMIN];
}

if (DASH_DASH_ARGS.includes('portal')) {
    commands.push({
        name: 'portal',
        command: 'yarn dev',
        cwd: path.resolve(__dirname, '../ghost/portal'),
        prefixColor: 'magenta',
        env: {}
    });
    COMMAND_GHOST.env['portal__url'] = 'http://localhost:5368/umd/portal.min.js';
}

(async () => {
    if (DASH_DASH_ARGS.includes('stripe')) {
        console.log('Fetching Stripe secret token..');

        let stripeSecret;
        try {
            stripeSecret = await exec('stripe listen --print-secret');
        } catch (err) {
            console.error('Failed to fetch Stripe secret token, do you need to connect Stripe CLI?', err);
            return;
        }

        if (!stripeSecret || !stripeSecret.stdout) {
            console.error('No Stripe secret was present');
            return;
        }

        COMMAND_GHOST.env['WEBHOOK_SECRET'] = stripeSecret.stdout.trim();
        commands.push({
            name: 'stripe',
            command: `stripe listen --forward-to ${siteUrl}members/webhooks/stripe/`,
            prefixColor: 'yellow',
            env: {}
        });
    }

    if (!commands.length) {
        console.log(`No commands provided`);
        process.exit(0);
    }

    const {result} = concurrently(commands, {
        prefix: 'name',
        killOthers: ['failure', 'success']
    });

    try {
        await result;
    } catch (err) {
        console.error('\nExecuting dev command failed, ensure dependencies are up-to-date by running `yarn fix`\n');
    }
})();
