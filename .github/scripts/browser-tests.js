const fs = require('fs');
const path = require('path');
const util = require('util');

const chalk = require('chalk');
const concurrently = require('concurrently');

// check we're running on Node 18 and above
const nodeVersion = parseInt(process.versions.node.split('.')[0]);
if (nodeVersion < 18) {
    console.error('`yarn dev` requires Node v18 or above. Please upgrade your version of Node.');
    process.exit(1);
}

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

const DASH_DASH_ARGS = process.argv.filter(a => a.startsWith('--')).map(a => a.slice(2));

const COMMAND_GHOST = {
    name: 'ghost',
    // Note: if this isn't working for you, please use Node 18 and above
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

let commands = [COMMAND_GHOST, COMMAND_TYPESCRIPT];

if (DASH_DASH_ARGS.includes('portal') || DASH_DASH_ARGS.includes('all')) {
    commands.push({
        name: 'portal',
        command: 'nx run @tryghost/portal:dev',
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
        command: DASH_DASH_ARGS.includes('signup') ? 'nx run @tryghost/signup-form:dev' : 'nx run @tryghost/signup-form:preview',
        cwd: path.resolve(__dirname, '../../apps/signup-form'),
        prefixColor: 'magenta',
        env: {}
    });
    COMMAND_GHOST.env['signupForm__url'] = 'http://localhost:6174/signup-form.min.js';
}

if (DASH_DASH_ARGS.includes('announcement-bar') || DASH_DASH_ARGS.includes('announcementBar') || DASH_DASH_ARGS.includes('announcementbar') || DASH_DASH_ARGS.includes('all')) {
    commands.push({
        name: 'announcement-bar',
        command: 'nx run @tryghost/announcement-bar:dev',
        cwd: path.resolve(__dirname, '../../apps/announcement-bar'),
        prefixColor: '#DC9D00',
        env: {}
    });
    COMMAND_GHOST.env['announcementBar__url'] = 'http://localhost:4177/announcement-bar.min.js';
}

if (DASH_DASH_ARGS.includes('search') || DASH_DASH_ARGS.includes('all')) {
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
        command: 'nx run @tryghost/comments-ui:dev',
        cwd: path.resolve(__dirname, '../../apps/comments-ui'),
        prefixColor: '#E55137',
        env: {}
    });
}

(async () => {
    if (!commands.length) {
        console.log(`No commands provided`);
        process.exit(0);
    }

    console.log(`Running projects: ${commands.map(c => chalk.green(c.name)).join(', ')}`);

    const {result} = concurrently(commands, {
        prefix: 'name',
        killOthers: ['failure', 'success']
    });

    try {
        await result;
    } catch (err) {
        console.error();
        console.error(chalk.red(`Executing dev command failed:`) + `\n`);
        console.error(chalk.red(`If you've recently done a \`yarn main\`, dependencies might be out of sync. Try running \`${chalk.green('yarn fix')}\` to fix this.`));
        console.error(chalk.red(`If not, something else went wrong. Please report this to the Ghost team.`));
        console.error();
    }
})();
