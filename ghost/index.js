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
    require('./core/cli/command').run(mode);
    break;
  case 'generate-data':
    process.stderr.write('Use pnpm gx data generate instead of node index.js generate-data.\n');
    process.exitCode = 1;
    break;
  default:
    require('./core/boot')();
}
