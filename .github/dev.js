const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const concurrently = require('concurrently');

// check we're running on Node 18 and above
const nodeVersion = parseInt(process.versions.node.split('.')[0]);
if (nodeVersion < 18) {
    console.error('`yarn dev` requires Node v18 or above. Please upgrade your version of Node.');
    process.exit(1);
}

const config = require('../ghost/core/core/shared/config/loader').loadNconf({
    customConfigPath: path.join(__dirname, '../ghost/core')
});

const liveReloadBaseUrl = config.getSubdir() || '/ghost/';
const siteUrl = config.getSiteUrl();

const DASH_DASH_ARGS = process.argv.filter(a => a.startsWith('--')).map(a => a.slice(2));

let commands = [];

const COMMAND_GHOST = {
    name: 'ghost',
    // Note: if this isn't working for you, please use Node 18 and above
    command: 'node --watch index.js',
    cwd: path.resolve(__dirname, '../ghost/core'),
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

if (DASH_DASH_ARGS.includes('revisions') || DASH_DASH_ARGS.includes('all')) {
    commands.push({
        name: 'post-revisions',
        command: 'yarn dev',
        cwd: path.resolve(__dirname, '../ghost/post-revisions'),
        prefixColor: 'green',
        env: {}
    });
}

if (DASH_DASH_ARGS.includes('in-memory-repository') || DASH_DASH_ARGS.includes('all')) {
    commands.push({
        name: 'in-memory-repository',
        command: 'yarn dev',
        cwd: path.resolve(__dirname, '../ghost/in-memory-repository'),
        prefixColor: 'pink',
        env: {}
    });
}

if (DASH_DASH_ARGS.includes('collections') || DASH_DASH_ARGS.includes('all')) {
    commands.push({
        name: 'collections',
        command: 'yarn dev',
        cwd: path.resolve(__dirname, '../ghost/collections'),
        prefixColor: 'pink',
        env: {}
    });
}

if (DASH_DASH_ARGS.includes('admin-x') || DASH_DASH_ARGS.includes('adminx') || DASH_DASH_ARGS.includes('adminX') || DASH_DASH_ARGS.includes('all')) {
    commands.push({
        name: 'adminX',
        command: 'yarn dev',
        cwd: path.resolve(__dirname, '../ghost/admin-x-settings'),
        prefixColor: '#C35831',
        env: {}
    });
    COMMAND_GHOST.env['adminX__url'] = 'http://localhost:4174/admin-x-settings.umd.js';
}

if (DASH_DASH_ARGS.includes('portal') || DASH_DASH_ARGS.includes('all')) {
    commands.push({
        name: 'portal',
        command: 'yarn dev',
        cwd: path.resolve(__dirname, '../apps/portal'),
        prefixColor: 'magenta',
        env: {}
    });
    COMMAND_GHOST.env['portal__url'] = 'http://localhost:4175/portal.min.js';
}

if (DASH_DASH_ARGS.includes('signup') || DASH_DASH_ARGS.includes('all')) {
    commands.push({
        name: 'signup-form',
        command: DASH_DASH_ARGS.includes('signup') ? 'yarn dev' : 'yarn preview',
        cwd: path.resolve(__dirname, '../ghost/signup-form'),
        prefixColor: 'magenta',
        env: {}
    });
    COMMAND_GHOST.env['signupForm__url'] = 'http://localhost:6174/signup-form.min.js';
}

if (DASH_DASH_ARGS.includes('announcement-bar') || DASH_DASH_ARGS.includes('announcementBar') || DASH_DASH_ARGS.includes('announcementbar') || DASH_DASH_ARGS.includes('all')) {
    commands.push({
        name: 'announcement-bar',
        command: 'yarn dev',
        cwd: path.resolve(__dirname, '../apps/announcement-bar'),
        prefixColor: '#DC9D00',
        env: {}
    });
    COMMAND_GHOST.env['announcementBar__url'] = 'http://localhost:5371/announcement-bar';
}

if (DASH_DASH_ARGS.includes('search') || DASH_DASH_ARGS.includes('all')) {
    commands.push({
        name: 'search',
        command: 'yarn dev',
        cwd: path.resolve(__dirname, '../apps/sodo-search'),
        prefixColor: '#23de43',
        env: {}
    });
    COMMAND_GHOST.env['sodoSearch__url'] = 'http://localhost:5370/umd/sodo-search.min.js';
    COMMAND_GHOST.env['sodoSearch__styles'] = 'http://localhost:5370/umd/main.css';
}

if (DASH_DASH_ARGS.includes('lexical')) {
    COMMAND_GHOST.env['editor__url'] = 'http://localhost:4173/koenig-lexical.umd.js';
}

async function handleStripe() {
    if (DASH_DASH_ARGS.includes('stripe') || DASH_DASH_ARGS.includes('all')) {
        if (DASH_DASH_ARGS.includes('offline')) {
            return;
        }
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
}

(async () => {
    await handleStripe();

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
