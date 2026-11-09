// Runs the demo app: the two editor bundles in watch mode, and the dev server.
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const vite = join(root, 'node_modules/.bin/vite');

const run = (args) =>
  spawn(vite, args, { cwd: root, stdio: 'inherit' }).on('exit', (code) => {
    if (code) {
      process.exitCode = code;
    }
  });

const children = [
  run(['build', '-c', 'vite.editor.config.ts', '--mode', 'render', '--watch']),
  run(['build', '-c', 'vite.editor.config.ts', '--mode', 'settings', '--watch']),
  run([]),
];

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const child of children) {
      child.kill(signal);
    }
    process.exit();
  });
}
