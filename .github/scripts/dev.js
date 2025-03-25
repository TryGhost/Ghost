const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const debug = require('debug')('ghost:dev');

const chalk = require('chalk');
const concurrently = require('concurrently');

// check we're running on Node 18 and above
debug('checking node version');
const nodeVersion = parseInt(process.versions.node.split('.')[0]);
if (nodeVersion < 18) {
    console.error('`yarn dev` requires Node v18 or above. Please upgrade your version of Node.');
    process.exit(1);
}
debug('node version check passed');

debug('loading config');
const config = require('../../ghost/core/core/shared/config/loader').loadNconf({
    customConfigPath: path.join(__dirname, '../../ghost/core')
});
debug('config loaded');

debug('loading ts packages');
const tsPackages = fs.readdirSync(path.resolve(__dirname, '../../ghost'), {withFileTypes: true})
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(packageFolder => {
        try {
            const packageJson = require(path.resolve(__dirname, `../../ghost/${packageFolder}/package.json`));
            return packageJson.scripts?.['build:ts'];
        } catch (err) {
            return false;
        }
    })
    .map(packageFolder => `ghost/${packageFolder}`)
    .join(',');
debug('ts packages loaded');

debug('loading live reload base url');
const liveReloadBaseUrl = config.getSubdir() || '/ghost/';
debug('live reload base url loaded');

debug('loading site url');
const siteUrl = config.getSiteUrl();
debug('site url loaded');

// Pass flags using GHOST_DEV_APP_FLAGS env var or --flag
debug('loading app flags')
const availableAppFlags = {
    'show-flags': 'Show available app flags, then exit',
    stripe: 'Run `stripe listen` to forward Stripe webhooks to the Ghost instance',
    all: 'Run all apps',
    ghost: 'Run only Ghost',
    admin: 'Run only Admin',
    'browser-tests': 'Run browser tests',
    announcementBar: 'Run Announcement Bar',
    announcementbar: 'Run Announcement Bar',
    'announcement-bar': 'Run Announcement Bar',
    portal: 'Run Portal',
    signup: 'Run Signup Form',
    search: 'Run Sodo Search',
    lexical: 'Use your local instance of the Lexical editor running in a separate process',
    comments: 'Run Comments UI',
    https: 'Serve apps using HTTPS',
    offline: 'Run in offline mode (no Stripe webhooks will be forwarded)'
}
const DASH_DASH_ARGS = process.argv.filter(a => a.startsWith('--')).map(a => a.slice(2));
const ENV_ARGS = process.env.GHOST_DEV_APP_FLAGS?.split(',') || [];
const GHOST_APP_FLAGS = [...ENV_ARGS, ...DASH_DASH_ARGS].filter(flag => flag.trim().length > 0);

function showAvailableAppFlags() {
    console.log(chalk.blue('App flags can be enabled by setting the GHOST_DEV_APP_FLAGS environment variable to a comma separated list of flags.'));
    console.log(chalk.blue('Alternatively, flags can be passed directly to `yarn dev`, i.e. `yarn dev --portal'));
    console.log(chalk.blue('Note: the `yarn docker:dev` command only supports the GHOST_DEV_APP_FLAGS environment variable, as --flags cannot be passed to the docker container.\n'));
    console.log(chalk.blue('Available app flags:'));
    for (const [flag, description] of Object.entries(availableAppFlags)) {
        console.log(chalk.blue(`  ${flag}: ${description}`));
    }
}

if (GHOST_APP_FLAGS.includes('show-flags')) {
    showAvailableAppFlags();
    process.exit(0);
}

// Check for invalid flags
debug('checking for invalid flags', GHOST_APP_FLAGS);
const invalidFlags = GHOST_APP_FLAGS.filter(flag => !Object.keys(availableAppFlags).includes(flag));
if (invalidFlags.length > 0) {
    console.error(chalk.red(`Error: Invalid app flag(s): ${invalidFlags.join(', ')}`));
    showAvailableAppFlags();
    process.exit(1);
}
debug('invalid flags check passed');


debug('app flags loaded');

debug('loading commands');
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

const COMMAND_BROWSERTESTS = {
    name: 'browser-tests',
    command: 'nx run ghost:test:browser',
    cwd: path.resolve(__dirname, '../../ghost/core'),
    prefixColor: 'blue',
    env: {}
};

const COMMAND_TYPESCRIPT = {
    name: 'ts',
    command: `while [ 1 ]; do nx watch --projects=${tsPackages} -- nx run \\$NX_PROJECT_NAME:build:ts; done`,
    cwd: path.resolve(__dirname, '../../'),
    prefixColor: 'cyan',
    env: {}
};

const adminXApps = '@tryghost/admin-x-demo,@tryghost/admin-x-settings,@tryghost/admin-x-activitypub,@tryghost/posts,@tryghost/stats';

const COMMANDS_ADMINX = [{
    name: 'adminXDeps',
    command: 'while [ 1 ]; do nx watch --projects=apps/admin-x-design-system,apps/admin-x-framework,apps/shade,apps/stats -- nx run \\$NX_PROJECT_NAME:build; done',
    cwd: path.resolve(__dirname, '../..'),
    prefixColor: '#C72AF7',
    env: {}
}, {
    name: 'adminX',
    command: `nx run-many --projects=${adminXApps} --parallel=${adminXApps.length} --targets=dev`,
    cwd: path.resolve(__dirname, '../../apps/admin-x-settings', '../../apps/admin-x-activitypub'),
    prefixColor: '#C72AF7',
    env: {}
}];

if (GHOST_APP_FLAGS.includes('ghost')) {
    commands = [COMMAND_GHOST, COMMAND_TYPESCRIPT];
} else if (GHOST_APP_FLAGS.includes('admin')) {
    commands = [COMMAND_ADMIN, ...COMMANDS_ADMINX];
} else if (GHOST_APP_FLAGS.includes('browser-tests')) {
    commands = [COMMAND_BROWSERTESTS];
} else {
    commands = [COMMAND_GHOST, COMMAND_TYPESCRIPT, COMMAND_ADMIN, ...COMMANDS_ADMINX];
}

if (GHOST_APP_FLAGS.includes('portal') || GHOST_APP_FLAGS.includes('all')) {
    commands.push({
        name: 'portal',
        command: 'nx run @tryghost/portal:dev',
        cwd: path.resolve(__dirname, '../../apps/portal'),
        prefixColor: 'magenta',
        env: {}
    });

    if (GHOST_APP_FLAGS.includes('https')) {
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

if (GHOST_APP_FLAGS.includes('signup') || GHOST_APP_FLAGS.includes('all')) {
    commands.push({
        name: 'signup-form',
        command: GHOST_APP_FLAGS.includes('signup') ? 'nx run @tryghost/signup-form:dev' : 'nx run @tryghost/signup-form:preview',
        cwd: path.resolve(__dirname, '../../apps/signup-form'),
        prefixColor: 'magenta',
        env: {}
    });
    COMMAND_GHOST.env['signupForm__url'] = 'http://localhost:6174/signup-form.min.js';
}

if (GHOST_APP_FLAGS.includes('announcement-bar') || GHOST_APP_FLAGS.includes('announcementBar') || GHOST_APP_FLAGS.includes('announcementbar') || GHOST_APP_FLAGS.includes('all')) {
    commands.push({
        name: 'announcement-bar',
        command: 'nx run @tryghost/announcement-bar:dev',
        cwd: path.resolve(__dirname, '../../apps/announcement-bar'),
        prefixColor: '#DC9D00',
        env: {}
    });
    COMMAND_GHOST.env['announcementBar__url'] = 'http://localhost:4177/announcement-bar.min.js';
}

if (GHOST_APP_FLAGS.includes('search') || GHOST_APP_FLAGS.includes('all')) {
    commands.push({
        name: 'search',
        command: 'nx run @tryghost/sodo-search:dev',
        cwd: path.resolve(__dirname, '../../apps/sodo-search'),
        prefixColor: '#23de43',
        env: {}
    });
    COMMAND_GHOST.env['sodoSearch__url'] = 'http://localhost:4178/sodo-search.min.js';
    COMMAND_GHOST.env['sodoSearch__styles'] = 'http://localhost:4178/main.css';
}

if (GHOST_APP_FLAGS.includes('lexical')) {
    if (GHOST_APP_FLAGS.includes('https')) {
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

if (GHOST_APP_FLAGS.includes('comments') || GHOST_APP_FLAGS.includes('all')) {
    if (GHOST_APP_FLAGS.includes('https')) {
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
        command: 'nx run @tryghost/comments-ui:dev',
        cwd: path.resolve(__dirname, '../../apps/comments-ui'),
        prefixColor: '#E55137',
        env: {}
    });
}

async function handleStripe() {
    if (GHOST_APP_FLAGS.includes('stripe') || GHOST_APP_FLAGS.includes('all')) {
        debug('stripe flag found');
        if (GHOST_APP_FLAGS.includes('offline') || GHOST_APP_FLAGS.includes('browser-tests')) {
            debug('offline or browser-tests flag found, skipping stripe');
            return;
        }
        debug('stripe flag found, proceeding');

        console.log('Fetching Stripe webhook secret...');
        let stripeSecret;
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        const apiKeyFlag = stripeSecretKey ? `--api-key ${stripeSecretKey}` : '';
        try {
            debug('fetching stripe secret');
            const stripeListenCommand = `stripe listen --print-secret ${apiKeyFlag}`;
            debug('stripe listen command', stripeListenCommand);
            stripeSecret = await Promise.race([
                exec(stripeListenCommand),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Stripe listen command timed out after 5 seconds')), 5000))
            ]);
            debug('stripe secret fetched');
        } catch (err) {
            console.error('Failed to fetch Stripe secret token. Please ensure either STRIPE_SECRET_KEY is set or you are logged in to the Stripe CLI by running `stripe login`.');
            console.error(err);
            process.exit(1);
        }

        if (!stripeSecret || !stripeSecret.stdout) {
            debug('no stripe secret found');
            console.error('No Stripe secret was present');
            console.error('Please ensure either STRIPE_SECRET_KEY is set or you are logged in to Stripe CLI by running `stripe login`.');
            return;
        }

        COMMAND_GHOST.env['WEBHOOK_SECRET'] = stripeSecret.stdout.trim();
        commands.push({
            name: 'stripe',
            command: `stripe listen --forward-to ${siteUrl}members/webhooks/stripe/ ${apiKeyFlag}`,
            prefixColor: 'yellow',
            env: {}
        });
    }
}

(async () => {
    debug('starting with commands', commands);
    debug('handling stripe');
    await handleStripe();
    debug('stripe handled');

    if (!commands.length) {
        debug('no commands provided');
        console.log(`No commands provided`);
        process.exit(0);
    }
    debug('at least one command provided');

    debug('resetting nx');
    process.env.NX_DISABLE_DB = "true";
    await exec("yarn nx reset --onlyDaemon");
    debug('nx reset');
    await exec("yarn nx daemon --start");
    debug('nx daemon started');

    console.log(`Running projects: ${commands.map(c => chalk.green(c.name)).join(', ')}`);

    debug('creating concurrently promise');
    const {result} = concurrently(commands, {
        prefix: 'name',
        killOthers: ['failure', 'success'],
        successCondition: 'first'
    });

    try {
        debug('running commands concurrently');
        await result;
        debug('commands completed');
    } catch (err) {
        debug('concurrently result error', err);
        console.error();
        console.error(chalk.red(`Executing dev command failed:`) + `\n`);
        console.error(chalk.red(`If you've recently done a \`yarn main\`, dependencies might be out of sync. Try running \`${chalk.green('yarn fix')}\` to fix this.`));
        console.error(chalk.red(`If not, something else went wrong. Please report this to the Ghost team.`));
        console.error();
        process.exit(1);
    }
})();
