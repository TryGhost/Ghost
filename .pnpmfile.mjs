// Global pnpm hooks for the Ghost monorepo.
//
// Only `beforePacking` is defined. It runs during `pnpm pack` / `pnpm publish`
// and mutates the package.json written *into the tarball* — the on-disk
// manifest is never touched, and dependency resolution / the shared lockfile
// are unaffected (no `readPackage`/`afterAllResolved` hook here).
//
// Applied to every packed/published package:
//   - drop `nx`            — Nx target config, meaningless to consumers
//   - drop `devDependencies` — never installed from a dependency tarball; inert
//     in a published manifest and only adds noise + phantom workspace refs
//
// Applied to the `ghost` package only (the Ghost-CLI release archive built by
// ghost/core/scripts/pack.js):
//   - rewrite its workspace deps to the bundled `file:components/*.tgz`
//     tarballs shipped in the archive (name→filename map via GHOST_COMPONENTS)
//   - strip `scripts` to the runtime set — Ghost-CLI starts Ghost with `node`,
//     not pnpm scripts, and the dev/build/test/lint scripts reference stripped
//     devDependencies
//
// (`packageManager` is carried over separately, post-pack, by pack.js.)

// Scripts retained in the packaged `ghost` manifest. Empty today: Ghost has no
// runtime pnpm scripts. Add names here if that changes.
const GHOST_RUNTIME_SCRIPTS = new Set([]);

function beforePacking(pkg) {
    delete pkg.nx;
    delete pkg.devDependencies;

    if (pkg.exports) {
        // remove any source condition exports, since the packages don't ship
        // the source files
        for (const key of Object.keys(pkg.exports)) {
            if (typeof pkg.exports[key] === 'object' && pkg.exports[key].source) {
                delete pkg.exports[key].source;
            }
        }
    }

    if (pkg.name !== 'ghost') {
        return pkg;
    }

    const components = JSON.parse(process.env.GHOST_COMPONENTS || '{}');
    for (const section of ['dependencies', 'optionalDependencies']) {
        if (!pkg[section]) {
            continue;
        }
        for (const name of Object.keys(pkg[section])) {
            if (components[name]) {
                pkg[section][name] = `file:components/${components[name]}`;
            }
        }
    }

    if (pkg.scripts) {
        pkg.scripts = Object.fromEntries(
            Object.entries(pkg.scripts).filter(([name]) => GHOST_RUNTIME_SCRIPTS.has(name))
        );
    }

    return pkg;
}

export const hooks = {beforePacking};
