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

const config = require('../../ghost/core/core/shared/config/loader').loadNconf({
    customConfigPath: path.join(__dirname, '../../ghost/core')
});

const liveReloadBaseUrl = config.getSubdir() || '/ghost/';
const siteUrl = config.getSiteUrl();

const DASH_DASH_ARGS = process.argv.filter(a => a.startsWith('--')).map(a => a.slice(2));

let commands = [];

const COMMAND_GHOST = {
    name: 'ghost',
    // Note: if this isn't working for you, please use Node 18 and above
    command: 'nx run ghost:dev',
    cwd: path.resolve(__dirname, '../../ghost/core'),
    prefixColor: 'blue',
    env: {
        // In development mode, we allow self-signed certificates (for sending webmentions and oembeds)
        NODE_TLS_REJECT_UNAUTHORIZED: '0',
    }
};

const COMMAND_ADMIN = {
    name: 'admin',
    command: `nx run ghost-admin:dev --live-reload-base-url=${liveReloadBaseUrl} --live-reload-port=4201`,
    cwd: path.resolve(__dirname, '../../ghost/admin'),
    prefixColor: 'green',
    env: {}
};

const COMMAND_TYPESCRIPT = {
    name: 'ts',
    command: 'nx watch --projects=ghost/collections,ghost/in-memory-repository,ghost/bookshelf-repository,ghost/mail-events,ghost/model-to-domain-event-interceptor,ghost/post-revisions,ghost/nql-filter-expansions,ghost/post-events,ghost/donations,ghost/recommendations -- nx run \\$NX_PROJECT_NAME:build:ts',
    cwd: path.resolve(__dirname, '../../'),
    prefixColor: 'cyan',
    env: {}
};

const COMMAND_ADMINX = {
    name: 'adminX',
    command: 'yarn dev',
    cwd: path.resolve(__dirname, '../../apps/admin-x-settings'),
    prefixColor: '#C35831',
    env: {}
};

if (DASH_DASH_ARGS.includes('ghost')) {
    commands = [COMMAND_GHOST, COMMAND_TYPESCRIPT];
} else if (DASH_DASH_ARGS.includes('admin')) {
    commands = [COMMAND_ADMIN, COMMAND_ADMINX];
} else {
    commands = [COMMAND_GHOST, COMMAND_TYPESCRIPT, COMMAND_ADMIN, COMMAND_ADMINX];
}

if (DASH_DASH_ARGS.includes('portal') || DASH_DASH_ARGS.includes('all')) {
    commands.push({
        name: 'portal',
        command: 'yarn dev',
        cwd: path.resolve(__dirname, '../../apps/portal'),
        prefixColor: 'magenta',
        env: {}
    });

    if (DASH_DASH_ARGS.includes('https')) {
        // Safari needs HTTPS for it to work
        // To make this work, you'll need a CADDY server running in front
        // Note the port is different because of this extra layer. Use the following Caddyfile:
        //    https://localhost:4176 {
        //        reverse_proxy http://localhost:4175
        //    }

        COMMAND_GHOST.env['portal__url'] = 'https://localhost:4176/portal.min.js';
    } else {
        COMMAND_GHOST.env['portal__url'] = 'http://localhost:4175/portal.min.js';
    }
}

if (DASH_DASH_ARGS.includes('signup') || DASH_DASH_ARGS.includes('all')) {
    commands.push({
        name: 'signup-form',
        command: DASH_DASH_ARGS.includes('signup') ? 'yarn dev' : 'yarn preview',
        cwd: path.resolve(__dirname, '../../apps/signup-form'),
        prefixColor: 'magenta',
        env: {}
    });
    COMMAND_GHOST.env['signupForm__url'] = 'http://localhost:6174/signup-form.min.js';
}

if (DASH_DASH_ARGS.includes('announcement-bar') || DASH_DASH_ARGS.includes('announcementBar') || DASH_DASH_ARGS.includes('announcementbar') || DASH_DASH_ARGS.includes('all')) {
    commands.push({
        name: 'announcement-bar',
        command: 'yarn dev',
        cwd: path.resolve(__dirname, '../../apps/announcement-bar'),
        prefixColor: '#DC9D00',
        env: {}
    });
    COMMAND_GHOST.env['announcementBar__url'] = 'http://localhost:4177/announcement-bar.min.js';
}

if (DASH_DASH_ARGS.includes('search') || DASH_DASH_ARGS.includes('all')) {
    commands.push({
        name: 'search',
        command: 'yarn dev',
        cwd: path.resolve(__dirname, '../../apps/sodo-search'),
        prefixColor: '#23de43',
        env: {}
    });
    COMMAND_GHOST.env['sodoSearch__url'] = 'http://localhost:4178/sodo-search.min.js';
    COMMAND_GHOST.env['sodoSearch__styles'] = 'http://localhost:4178/main.css';
}

if (DASH_DASH_ARGS.includes('lexical')) {
    if (DASH_DASH_ARGS.includes('https')) {
        // Safari needs HTTPS for it to work
        // To make this work, you'll need a CADDY server running in front
        // Note the port is different because of this extra layer. Use the following Caddyfile:
        //    https://localhost:41730 {
        //        reverse_proxy http://127.0.0.1:4173
        //    }

        COMMAND_ADMIN.env['EDITOR_URL'] = 'https://localhost:41730/';
    } else {
        COMMAND_ADMIN.env['EDITOR_URL'] = 'http://localhost:4173/';
    }
}

if (DASH_DASH_ARGS.includes('comments') || DASH_DASH_ARGS.includes('all')) {
    if (DASH_DASH_ARGS.includes('https')) {
        // Safari needs HTTPS for it to work
        // To make this work, you'll need a CADDY server running in front
        // Note the port is different because of this extra layer. Use the following Caddyfile:
        //    https://localhost:7174 {
        //        reverse_proxy http://127.0.0.1:7173
        //    }
        COMMAND_GHOST.env['comments__url'] = 'https://localhost:7174/comments-ui.min.js';
    } else {
        COMMAND_GHOST.env['comments__url'] = 'http://localhost:7173/comments-ui.min.js';
    }

    commands.push({
        name: 'comments',
        command: 'yarn dev',
        cwd: path.resolve(__dirname, '../../apps/comments-ui'),
        prefixColor: '#E55137',
        env: {}
    });
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
