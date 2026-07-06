/* global process */
/**
 * CI gate: fail if the generated locale registry is out of date.
 *
 * Mirrors the existing `translate` gate — regenerates the registry into a TEMP
 * dir (never touching the tracked lib/registry) and compares against the committed
 * output. If they differ (e.g. a locale or namespace was added without re-running
 * codegen), reports the drift and exits non-zero so the bundled ESM can never
 * silently desync from the on-disk locale JSONs.
 */
const {execFileSync} = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const I18N_ROOT = path.join(__dirname, '..');
const COMMITTED_DIR = path.join(I18N_ROOT, 'lib', 'registry');
const GEN_SCRIPT = path.join(__dirname, 'generate-locale-registry.js');

function snapshot(dir) {
    if (!fs.existsSync(dir)) {
        return {};
    }
    const out = {};
    for (const f of fs.readdirSync(dir).sort()) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isFile()) {
            out[f] = fs.readFileSync(full, 'utf8');
        }
    }
    return out;
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-registry-check-'));
try {
    // Regenerate into the temp dir — leaves tracked files untouched.
    execFileSync(process.execPath, [GEN_SCRIPT], {
        stdio: 'ignore',
        env: {...process.env, I18N_REGISTRY_OUT_DIR: tmpDir}
    });

    const committed = snapshot(COMMITTED_DIR);
    const fresh = snapshot(tmpDir);

    const committedKeys = Object.keys(committed);
    const freshKeys = Object.keys(fresh);
    const drifted = freshKeys.length !== committedKeys.length
        || freshKeys.some(k => committed[k] !== fresh[k]);

    if (drifted) {
        process.stderr.write(
            'ERROR: lib/registry/* is out of date. Run `pnpm --filter @tryghost/i18n build:registry` and commit the result.\n'
        );
        process.exit(1);
    }

    process.stdout.write('locale registry is up to date\n');
} finally {
    fs.rmSync(tmpDir, {recursive: true, force: true});
}
