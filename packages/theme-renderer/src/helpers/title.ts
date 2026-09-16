/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/title.js @ 407e032dc7 — transforms: imports→seam
// # Title Helper
// Usage: `{{title}}`
//
// Overrides the standard behavior of `{[title}}` to ensure the content is correctly escaped

import { SafeString, escapeExpression } from '../seam/handlebars-env.ts';

export default function title(this: any) {
  return new SafeString(escapeExpression(this.title || ''));
}
