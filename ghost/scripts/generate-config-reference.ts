#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { buildJsonSchema, buildMarkdownReference } from '../core/shared/config/reference';

const REFERENCE_PATH = path.resolve(__dirname, '../core/shared/config/REFERENCE.md');

async function write(filePath: string, contents: string) {
  const outputPath = path.resolve(filePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, contents, 'utf8');
}

async function main() {
  const { values } = parseArgs({
    options: {
      markdown: { type: 'string', default: REFERENCE_PATH },
      json: { type: 'string' },
    },
  });

  await write(values.markdown, buildMarkdownReference());

  if (values.json) {
    await write(values.json, `${JSON.stringify(buildJsonSchema(), null, 2)}\n`);
  }
}

void main();
