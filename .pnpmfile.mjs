// Global pnpm hooks for the Ghost monorepo.
//
// `beforePacking` runs during `pnpm pack` / `pnpm publish` and mutates the
// package.json written *into the tarball* — the on-disk manifest is never
// touched. `readPackage` runs during resolution, so it *does* feed the shared
// lockfile.
//
// Applied to every packed/published package:
//   - drop `nx`            — Nx target config, meaningless to consumers
//   - drop `devDependencies` — never installed from a dependency tarball; inert
//     in a published manifest and only adds noise + phantom workspace refs
//
// Applied to the `ghost` package only (the Ghost-CLI release archive built by
// ghost/scripts/pack.mjs):
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
      Object.entries(pkg.scripts).filter(([name]) => GHOST_RUNTIME_SCRIPTS.has(name)),
    );
  }

  return pkg;
}

// Drops optional peers (all of them, or only `names`). pnpm links any optional
// peer the workspace happens to satisfy, dragging it into production closures.
// Required peers are kept so pnpm still enforces them.
function dropOptionalPeers(pkg, names) {
  for (const [name, meta] of Object.entries(pkg.peerDependenciesMeta ?? {})) {
    if (meta?.optional && (!names || names.includes(name))) {
      delete pkg.peerDependencies?.[name];
      delete pkg.peerDependenciesMeta[name];
    }
  }
}

function readPackage(pkg) {
  // consolidate declares 48 template engines as optional peers. pnpm links any
  // that another workspace package happens to satisfy, so react, react-dom and
  // @babel/core rode into ghost's production deploy closure via
  // nodemailer-mailgun-transport — the only thing that pulls consolidate in, and
  // it never renders through it. packageExtensions can only add, so dropping the
  // peers outright needs this hook.
  if (pkg.name === 'consolidate') {
    dropOptionalPeers(pkg);
  }

  // The 8.x Elasticsearch client hard-depends on apache-arrow for two ES|QL
  // helpers nothing in Ghost calls - @tryghost/logging and @tryghost/metrics only
  // index documents. Worth 15 packages / ~15MB installed, and 145 modules /
  // ~3.3MB RSS per process using the log transport. The matching patch defers the
  // require, 9.x-style. Delete rather than re-declare as an optional peer:
  // autoInstallPeers installs those anyway, and it peer-forks @tryghost/logging
  // and everything above it. Drop both when the client reaches 9.x.
  if (pkg.name === '@elastic/elasticsearch') {
    delete pkg.dependencies?.['apache-arrow'];
  }

  // these deps pull in typescript as an optional peer dep, which ends up
  // being included in Ghost's production image because of the way pnpm hoists
  // optional peers. We don't want to ship ts in the prod image so we delete
  // it from the manifest
  //
  // NOTE: auto-install-peers: false doesn't solve the problem here unfortunately,
  // and it causes more issues with other deps
  if (['viem', 'ox', 'abitype'].includes(pkg.name)) {
    dropOptionalPeers(pkg, ['typescript']);
  }

  // abitype's zod peer is only used by its `abitype/zod` subpath, which nothing
  // in the tree imports. Left in place it peer-forks abitype and everything
  // above it: mppx resolves that chain against zod 4 and @x402/* against zod 3,
  // so ghost's production closure carried two identical copies of viem (~2.9k
  // files each), ox and abitype.
  if (pkg.name === 'abitype') {
    dropOptionalPeers(pkg, ['zod']);
  }

  // better-auth declares its framework clients, ORM adapters and test helpers
  // as optional peers. pnpm satisfied vitest and react from the workspace,
  // pulling ~150 packages (vitest, vite, playwright, typescript, react) into
  // ghost's production closure. Ghost uses only the server with its own Knex
  // adapter, so none of them are needed.
  if (pkg.name === 'better-auth') {
    dropOptionalPeers(pkg);
  }

  return pkg;
}

export const hooks = { beforePacking, readPackage };
