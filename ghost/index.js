/**
 * Boot Ghost, or direct retired development commands to the contributor CLI.
 * Keep this entrypoint dependency-free until server boot is selected.
 */

// Don't allow NODE_ENV to be null
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const argv = process.argv;
const mode = argv[2];

// Switch between boot modes
switch (mode) {
  case 'repl':
  case 'timetravel':
  case 'generate-data': {
    const command = {
      repl: 'repl',
      timetravel: 'data shift-dates',
      'generate-data': 'data generate',
    }[mode];
    process.stderr.write(`Use pnpm gx ${command} instead of node index.js ${mode}.\n`);
    process.exitCode = 1;
    break;
  }
  default:
    require('./core/boot')();
}
