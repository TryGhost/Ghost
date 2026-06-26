// Pure derivation of the shared DB-template identifiers from a per-fork database
// identifier. Kept dependency-free (NO Ghost config/db imports) so it can be
// required by the vitest globalSetup BEFORE Ghost's config loads.
//
// `vitest-setup-db.ts` appends a per-fork session suffix to a base database
// identifier. Stripping that suffix yields a value shared across every fork of
// the run, to which we add a stable `template` marker. globalSetup derives from
// the raw (un-suffixed) base; the forks derive from their suffixed config value
// at restore time — because both strip the suffix, they resolve to the identical
// template.

// MySQL: the per-fork suffix is `_<8 hex>` appended to a database name.
const deriveMySQLTemplateDatabase = (database) => {
    const base = database.replace(/_[a-f0-9]{8}$/i, '');
    return `${base}_template`;
};

// SQLite: the per-fork suffix is `-pool_<N>` (or `-<8 hex>` when there is no
// VITEST_POOL_ID) inserted before the `.db` extension — see vitest-setup-db.ts.
// Strip whichever suffix is present, then append a `-template.db` marker. The
// marker is distinct from every per-fork name (no fork is named `template`), so
// the template file can never collide with a `pool_N.db` a fork would open.
// globalSetup passes the un-suffixed base (e.g. `/tmp/ghost-test.db`); a fork
// passes its own suffixed filename — both resolve to `<base>-template.db`.
const deriveSQLiteTemplateFilename = (filename) => {
    const withoutDb = filename.replace(/\.db$/i, '');
    const base = withoutDb.replace(/-(?:pool_\d+|[a-f0-9]{8})$/i, '');
    return `${base}-template.db`;
};

module.exports = {
    deriveMySQLTemplateDatabase,
    deriveSQLiteTemplateFilename
};
