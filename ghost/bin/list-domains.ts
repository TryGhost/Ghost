#!/usr/bin/env node

// Prints every file the domain layer finds in ghost/domains, one per line, in
// the order and form the manifest test compares against.
//
// Usage: bin/list-domains.js [--write]
//   --write  also saves the list as domains/manifest.txt, the expected list
//            the manifest test checks. Do this when a file is added on purpose.

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { describeManifest } from '../core/kernel/domains/discover';
import { domainsRoot, getDomainManifest } from '../core/bootstrap/domains/manifest';

const lines = describeManifest(getDomainManifest());
process.stdout.write(lines.length ? `${lines.join('\n')}\n` : '');
if (process.argv.includes('--write')) {
  writeFileSync(path.join(domainsRoot, 'manifest.txt'), lines.map((line) => `${line}\n`).join(''));
}
