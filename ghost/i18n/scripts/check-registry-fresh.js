/* global process */
/**
 * CI gate: fail if the generated locale registry is out of date.
 *
 * Mirrors the existing `translate` gate — regenerates the registry into a temp
 * dir and compares against the committed output. If they differ (e.g. a locale or
 * namespace was added without re-running codegen), exits non-zero in CI so the
 * bundled ESM can never silently desync from the on-disk locale JSONs.
 */
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const I18N_ROOT = path.join(__dirname, '..');
const REGISTRY_DIR = path.join(I18N_ROOT, 'lib', 'registry');
const GEN_SCRIPT = path.join(__dirname, 'generate-locale-registry.js');

function snapshot(dir) {
    if (!fs.existsSync(dir)) {
        return {};
    }
    const out = {};
    for (const f of fs.readdirSync(dir).sort()) {
        out[f] = fs.readFileSync(path.join(dir, f), 'utf8');
    }
    return out;
}

const before = snapshot(REGISTRY_DIR);

// Regenerate in place (deterministic output), then compare.
execFileSync(process.execPath, [GEN_SCRIPT], {stdio: 'ignore'});

const after = snapshot(REGISTRY_DIR);

const beforeKeys = Object.keys(before);
const afterKeys = Object.keys(after);
const stale = afterKeys.length !== beforeKeys.length
    || afterKeys.some(k => before[k] !== after[k]);

if (stale) {
    process.stderr.write(
        'ERROR: lib/registry/* is out of date. Run `pnpm --filter @tryghost/i18n build:registry` and commit the result.\n'
    );
    // In CI, fail hard. Locally, the regen above already fixed the files.
    if (process.env.CI) {
        process.exit(1);
    }
}

process.stdout.write('locale registry is up to date\n');
