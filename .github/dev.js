const path = require('path');
const concurrently = require('concurrently');

const config = require('../ghost/core/core/shared/config');
const liveReloadBaseUrl = config.getSubdir() || '/ghost/';

const DASH_DASH_ARGS = process.argv.filter(a => a.startsWith('--')).map(a => a.slice(2));

let commands = [];

const COMMAND_GHOST = {
    name: 'ghost',
    command: 'yarn nodemon -q -i ghost/admin -i ghost/core/content -i ghost/core/core/built',
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

if (!commands.length) {
    console.log(`No commands provided`);
    process.exit(0);
}

(async () => {
    const {result} = concurrently(commands, {
        prefix: 'name',
        killOthers: ['failure', 'success']
    });

    try {
        await result;
    } catch (err) {
        console.error(err);
    }
})();
