#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { parseQueryParameterPolicy } from '../core/server/web/query-parameter-policy/schema';

const POLICY_PATH = path.resolve(
  __dirname,
  '../core/server/web/query-parameter-policy/policy.json',
);
const USAGE = 'Usage: pnpm query-parameter-policy:export --output <file-path>';

async function main() {
  const { values } = parseArgs({
    options: {
      output: { type: 'string', short: 'o' },
    },
  });

  if (!values.output) {
    throw new Error(`Missing required --output option.\n${USAGE}`);
  }

  const manifest = JSON.parse(await readFile(POLICY_PATH, 'utf8'));
  const policy = parseQueryParameterPolicy(manifest);
  const outputPath = path.resolve(values.output);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(policy, null, 4)}\n`, 'utf8');
}

void main();
