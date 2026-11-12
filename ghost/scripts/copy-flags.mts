#!/usr/bin/env node

/**
 * Copies the flag of every country a phone number can be from into Core's public folder, where
 * the site serves them to Portal's phone input at /public/flags/<country>.svg.
 *
 * The flags are country-flag-icons' 3x2 set, the version Shade uses, so Portal shows the same
 * flags as Admin. They're committed rather than built, so a release serves exactly what was
 * reviewed. Run this after country-flag-icons changes; a unit test fails until the copies match.
 *
 *     pnpm --filter ghost flags:copy
 */

import { CALLING_CODES } from '@tryghost/metafield-types/phone';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const source = path.join(path.dirname(require.resolve('country-flag-icons/package.json')), '3x2');
const target = path.join(import.meta.dirname, '../core/frontend/public/flags');

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
const countries = Object.keys(CALLING_CODES);
for (const country of countries) {
  fs.copyFileSync(path.join(source, `${country}.svg`), path.join(target, `${country}.svg`));
}
console.log(`Copied ${countries.length} flags to ${path.relative(process.cwd(), target)}`);
