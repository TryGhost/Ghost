/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/raw.js @ 407e032dc7 — transforms: imports→seam
// # Raw helper
// Usage: `{{{{raw}}}}...{{{{/raw}}}}`
//
// Returns raw contents unprocessed by handlebars.

export default function raw(this: any, options: any) {
  return options.fn(this);
}
