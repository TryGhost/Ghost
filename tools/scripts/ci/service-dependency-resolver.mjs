import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

// The CLI exposes full resolver options through its webpackConfig hook. Its
// config loader needs a JS entrypoint; a .ts entrypoint would require ts-node.
// Prefer authored source even when Core's build:tsc has emitted adjacent JS.
export default {
  resolve: {
    extensions: [
      '.ts',
      '.tsx',
      '.mts',
      '.cts',
      '.js',
      '.jsx',
      '.mjs',
      '.cjs',
      '.json',
      '.node',
      '.d.ts',
      '.d.mts',
      '.d.cts',
    ],
    extensionAlias: {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    },
  },
};

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function sourceExclusions(root) {
  const exclusions = ['\\.d\\.[cm]?ts$'];
  const core = path.join(root, 'ghost/core');
  for (const entry of readdirSync(core, { recursive: true, withFileTypes: true })) {
    if (
      !entry.isFile() ||
      !/\.(?:[cm]?ts|tsx)$/.test(entry.name) ||
      /\.d\.[cm]?ts$/.test(entry.name)
    ) {
      continue;
    }
    const output = path.join(entry.parentPath, entry.name.replace(/\.([cm]?)tsx?$/, '.$1js'));
    if (existsSync(output)) {
      // Only a matching TypeScript source establishes an emitted companion;
      // authored JavaScript elsewhere remains part of the graph.
      exclusions.push(`^${escape(path.relative(root, output).split(path.sep).join('/'))}$`);
    }
  }
  return exclusions;
}
