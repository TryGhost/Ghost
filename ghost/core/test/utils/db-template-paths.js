// Pure derivation of the shared DB-template name from a per-fork database
// identifier. Kept dependency-free (NO Ghost config/db imports) so it can be
// required by the vitest globalSetup BEFORE Ghost's config loads.
//
// `vitest-setup-db.ts` appends a per-fork session suffix to a base MySQL database
// name. Stripping that suffix yields a value shared across every fork of the run,
// to which we add a stable `template` marker. globalSetup derives from the raw
// (un-suffixed) base; the forks derive from their suffixed config value at restore
// time — because both strip the suffix, they resolve to the identical template.

// MySQL: the per-fork suffix is `_<8 hex>` appended to a database name.
const deriveMySQLTemplateDatabase = (database) => {
  const base = database.replace(/_[a-f0-9]{8}$/i, '');
  return `${base}_template`;
};

module.exports = {
  deriveMySQLTemplateDatabase,
};
