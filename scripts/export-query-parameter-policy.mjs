#!/usr/bin/env node

import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

const require = createRequire(import.meta.url);
const {validateQueryParameterPolicy} = require('../ghost/core/core/server/web/query-parameter-policy/schema.ts');

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_FILENAME = 'query-parameter-policy.json';
const POLICY_PATH = join(ROOT_DIR, 'ghost/core/core/server/web/query-parameter-policy/policy.json');
const USAGE = 'Usage: pnpm query-parameter-policy:export --output <directory>';

const {values} = parseArgs({
    options: {
        output: {type: 'string', short: 'o'}
    }
});

if (!values.output) {
    throw new Error(`Missing required --output option.\n${USAGE}`);
}

const manifest = JSON.parse(await readFile(POLICY_PATH, 'utf8'));
const policy = validateQueryParameterPolicy(manifest);
const outputDirectory = resolve(values.output);
const outputPath = join(outputDirectory, POLICY_FILENAME);

await mkdir(outputDirectory, {recursive: true});
await writeFile(outputPath, `${JSON.stringify(policy, null, 4)}\n`, 'utf8');

process.stdout.write(`${outputPath}\n`);
