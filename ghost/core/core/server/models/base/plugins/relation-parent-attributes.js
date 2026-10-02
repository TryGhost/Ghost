const Relation = require('bookshelf/lib/relation');

/**
 * Bookshelf's `Relation#init` runs the parent's entire attribute set through
 * `parent.format()` so that key lookups use database column names, in case a
 * model's `format()` renames attributes. It then only reads key columns from
 * the result (the parent id, foreign keys and morph keys).
 *
 * Ghost's `format()` overrides never rename attributes or change key columns,
 * but they do convert every date back to a string, coerce settings values and
 * transform image URLs - for each relation set up on each model. Eager-loading
 * tags, authors and tiers for a page of posts paid for that three times per
 * post, and threw all of it away.
 *
 * This runs `init` with `format()` swapped for a plain copy of the attributes,
 * which gives Bookshelf the same key values without the conversion work. The
 * "format() leaves relation keys alone" assumption is enforced by a unit test
 * across every registered model.
 *
 * Bookshelf is pinned to 1.2.0, where `init` calls `parent.format` exactly
 * once; revisit this plugin if Bookshelf is upgraded.
 */
const PATCHED = Symbol('ghostRelationParentAttributes');

function identityFormat(attrs) {
  return attrs;
}

module.exports = function () {
  if (Relation.prototype.init[PATCHED]) {
    return;
  }

  const originalInit = Relation.prototype.init;

  function init(parent) {
    const hasOwnFormat = Object.hasOwn(parent, 'format');
    const ownFormat = parent.format;

    parent.format = identityFormat;

    try {
      return originalInit.call(this, parent);
    } finally {
      if (hasOwnFormat) {
        parent.format = ownFormat;
      } else {
        delete parent.format;
      }
    }
  }

  init[PATCHED] = true;
  Relation.prototype.init = init;
};
