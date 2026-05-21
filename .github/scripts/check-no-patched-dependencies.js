const fs = require('fs');
const path = require('path');

// pnpm patch is unsupported in this repo.
//
// `pnpm patch` writes a patch file under `patches/` and references it via
// `patchedDependencies`. Ghost's production image (Dockerfile.production)
// installs from the packed ghost/core archive, which does NOT contain the
// repo-root `patches/` directory — so `pnpm install --prod` aborts with
// `ENOENT: ... patches/<name>.patch` and Build & Publish fails.
//
// pnpm 10 allows `patchedDependencies` in either package.json or
// pnpm-workspace.yaml, so both are checked. This guard runs in CI (the Lint
// job) so a patch can never reach main again — see PR #28009, which shipped
// one and broke the production build.

const repoRoot = path.join(__dirname, '..', '..');
const offenders = [];

// 1. package.json -> pnpm.patchedDependencies
const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const fromPkg = pkg.pnpm && pkg.pnpm.patchedDependencies;
if (fromPkg && Object.keys(fromPkg).length > 0) {
    offenders.push(`package.json -> pnpm.patchedDependencies (${Object.keys(fromPkg).join(', ')})`);
}

// 2. pnpm-workspace.yaml -> patchedDependencies
// Lightweight text scan so this can run before `pnpm install` (no YAML dep).
const workspaceFile = path.join(repoRoot, 'pnpm-workspace.yaml');
if (fs.existsSync(workspaceFile)) {
    const lines = fs.readFileSync(workspaceFile, 'utf8').split('\n');
    const idx = lines.findIndex(line => /^patchedDependencies:/.test(line));
    if (idx !== -1) {
        const inline = lines[idx].slice('patchedDependencies:'.length).trim();
        const hasInlineEntries = inline !== '' && inline !== '{}';
        const hasBlockEntries = /^\s+\S/.test(lines[idx + 1] || '');
        if (hasInlineEntries || hasBlockEntries) {
            offenders.push('pnpm-workspace.yaml -> patchedDependencies');
        }
    }
}

if (offenders.length > 0) {
    console.error('::error::pnpm patched dependencies are not allowed (breaks the production build)');
    console.error(`
pnpm patched dependencies were found:
${offenders.map(o => `  - ${o}`).join('\n')}

Ghost's production image (Dockerfile.production) installs from the packed
ghost/core archive, which does not include the repo-root patches/ directory.
\`pnpm install --prod\` then fails with ENOENT on the patch file, breaking
Build & Publish.

Remove the patch and use a supported alternative instead:
  - a thin wrapper module around the dependency
  - an upstream fix
  - a dependency version bump
`);
    process.exit(1);
}

console.log('OK: no pnpm patched dependencies.');
