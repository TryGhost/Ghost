#!/usr/bin/env node

// nodemon runs this before each Ghost start, so edits to the browser assets
// Ghost serves reach the site without restarting `pnpm dev`

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');

const sources = [
  'core/frontend/src',
  ...fs
    .readdirSync(path.join(projectRoot, 'core/frontend/src'), { recursive: true })
    .map((file) => path.join('core/frontend/src', file)),
  'core/frontend/public/ghost.css',
  'core/frontend/public/private.js',
];

const mtime = (file: string) =>
  fs.statSync(path.join(projectRoot, file), { throwIfNoEntry: false })?.mtimeMs ?? 0;

// Every build rewrites the card manifest (postcss skips unchanged output), so it dates the
// last build. nodemon.json ignores the outputs: a watched one would restart Ghost mid-build
if (Math.max(...sources.map(mtime)) > mtime('core/frontend/public/cards.manifest.json')) {
  const { scripts } = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  await Promise.all(
    Object.keys(scripts)
      .filter((name) => name.startsWith('build:assets:'))
      .map((name) =>
        once(spawn(scripts[name], { cwd: projectRoot, shell: true, stdio: 'inherit' }), 'exit'),
      ),
  );
}
