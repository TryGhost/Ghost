#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { validateQueryParameterPolicy } from '../core/server/web/query-parameter-policy/schema';

const POLICY_FILENAME = 'query-parameter-policy.json';
const POLICY_PATH = path.resolve(
  __dirname,
  '../core/server/web/query-parameter-policy/policy.json',
);
const USAGE = 'Usage: pnpm query-parameter-policy:export --output <directory>';

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
  const policy = validateQueryParameterPolicy(manifest);
  const outputDirectory = path.resolve(values.output);
  const outputPath = path.join(outputDirectory, POLICY_FILENAME);

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(policy, null, 4)}\n`, 'utf8');
}

void main();
