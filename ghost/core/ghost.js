/**
 * Internal CLI Placeholder
 *
 * If we want to add alternative commands, flags, or modify environment vars, it should all go here.
 * Important: This file should not contain any requires, unless we decide to add pretty-cli/commander type tools
 *
 **/

// Don't allow NODE_ENV to be null
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const argv = process.argv;
const mode = argv[2];

// Switch between boot modes
switch (mode) {
case 'repl':
case 'timetravel':
case 'generate-data':
    require('./core/cli/command').run(mode);
    break;
default:
    // New boot sequence
    require('./core/boot')();
}
