#!/usr/bin/env node
import {parseArgs} from 'node:util';
import {cp, readFile, writeFile, readdir, stat, rm, mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join, dirname, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE_DIR = join(ROOT, 'packages', '_template');
const PACKAGES_DIR = join(ROOT, 'packages');

const USAGE = `Usage: pnpm create-package <name> [options]

Scaffold a new ESM-only, tsc-built package from packages/_template.

Arguments:
  <name>                 Unscoped package name (kebab-case). Becomes @tryghost/<name>.

Options:
  --dir <path>           Target directory, relative to the repo root. Defaults to
                         packages/<name>. Use this for nested locations, e.g.
                         --dir packages/email/parser. Ensure pnpm-workspace.yaml's
                         package globs cover the location you choose.
  --description <text>   One-line package description for README/package.json.
  -h, --help             Show this help.

After scaffolding, run \`pnpm install\` so the new workspace member is linked.`;

function fail(message) {
    process.stderr.write(`\n\x1b[31m${message}\x1b[0m\n\n${USAGE}\n`);
    process.exit(1);
}

const {values, positionals} = parseArgs({
    allowPositionals: true,
    options: {
        dir: {type: 'string'},
        description: {type: 'string'},
        help: {type: 'boolean', short: 'h', default: false}
    }
});

if (values.help) {
    process.stdout.write(`${USAGE}\n`);
    process.exit(0);
}

const name = positionals[0];
if (!name) {
    fail('Missing package name.');
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    fail(`Invalid package name "${name}". Use lowercase kebab-case, e.g. "email-utils" (no @scope — it becomes @tryghost/${name}).`);
}

const targetDir = values.dir ? resolve(ROOT, values.dir) : join(PACKAGES_DIR, name);
// Path relative to the repo root, always forward-slashed for package.json.
const packageDir = relative(ROOT, targetDir).split(sep).join('/');
if (packageDir.startsWith('../') || packageDir === '' || packageDir === '..') {
    fail(`--dir must resolve to a location inside the repository. Got: ${targetDir}`);
}
if (existsSync(targetDir)) {
    fail(`${packageDir} already exists.`);
}

const description = values.description ?? `The ${name} package for Ghost.`;

// Recursively collect every file path under a directory.
async function walk(dir) {
    const entries = await readdir(dir, {withFileTypes: true});
    const files = [];
    for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await walk(full));
        } else {
            files.push(full);
        }
    }
    return files;
}

function applyTokens(text) {
    return text
        .replaceAll('{{NAME}}', name)
        .replaceAll('{{DIRECTORY}}', packageDir)
        .replaceAll('{{DESCRIPTION}}', description);
}

await mkdir(dirname(targetDir), {recursive: true});
await cp(TEMPLATE_DIR, targetDir, {recursive: true});

for (const file of await walk(targetDir)) {
    // Skip anything that shouldn't have leaked into the template copy.
    if ((await stat(file)).size === 0) {
        continue;
    }
    let text = applyTokens(await readFile(file, 'utf8'));

    if (file.endsWith('package.json')) {
        // Re-serialize so the tokenized JSON is normalized.
        text = `${JSON.stringify(JSON.parse(text), null, 2)}\n`;
    }

    await writeFile(file, text);
}

// Clean any stray build artifacts the template dir may have accumulated.
await rm(join(targetDir, 'build'), {recursive: true, force: true});

process.stdout.write(`\n\x1b[32m✓ Created @tryghost/${name}\x1b[0m at ${packageDir} (ESM-only)\n\nNext steps:\n  1. pnpm install                     # link the new workspace member\n  2. pnpm --filter @tryghost/${name} test\n  3. Add real code in ${packageDir}/src/index.ts\n\n`);
