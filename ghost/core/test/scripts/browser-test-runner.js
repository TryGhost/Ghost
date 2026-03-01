/**
 * Browser Test Runner
 *
 * Starts the frontend dev servers (Portal, Comments UI, etc.) and runs
 * Playwright browser tests concurrently. The browser tests expect these
 * apps to be available on specific ports.
 */
const concurrently = require('concurrently');

// Pass-through args (everything after --)
const doubleDashIndex = process.argv.lastIndexOf('--');
const passThroughArgs = doubleDashIndex === -1 ? [] : process.argv.slice(doubleDashIndex + 1);
const PASS_THROUGH_FLAGS = passThroughArgs.join(' ');

// Frontend dev servers needed by browser tests
// These ports are hardcoded in ghost/core/test/e2e-browser/fixtures/ghost-test.js
const commands = [
    {
        name: 'browser-tests',
        command: `nx run ghost:test:browser${PASS_THROUGH_FLAGS ? ` -- ${PASS_THROUGH_FLAGS}` : ''}`,
        prefixColor: 'blue'
    },
    {
        name: 'portal',
        command: 'nx run @tryghost/portal:dev',
        prefixColor: 'magenta'
    },
    {
        name: 'comments',
        command: 'nx run @tryghost/comments-ui:dev',
        prefixColor: '#E55137'
    },
    {
        name: 'signup-form',
        command: 'nx run @tryghost/signup-form:preview',
        prefixColor: 'magenta'
    },
    {
        name: 'announcement-bar',
        command: 'nx run @tryghost/announcement-bar:dev',
        prefixColor: '#DC9D00'
    },
    {
        name: 'search',
        command: 'nx run @tryghost/sodo-search:dev',
        prefixColor: '#23de43'
    }
];

(async () => {
    // eslint-disable-next-line no-console
    console.log(`Starting browser tests with frontend dev servers...`);

    const {result} = concurrently(commands, {
        prefix: 'name',
        killOthers: ['failure', 'success'],
        successCondition: 'first'
    });

    try {
        await result;
    } catch (err) {
        process.exit(1);
    }
})();
