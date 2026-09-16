/**
 * The ONE deep-merge used on the templateOptions tree.
 *
 * express-hbs combines global and local template options with lodash
 * `_.merge({}, templateOptions, localTemplateOptions)` (lib/hbs.js:499
 * @ 2.5.0), and the rendering-side ports (index.ts, template-options.ts,
 * format-response.ts) already use `_.merge` — so the engine delegates to
 * lodash rather than approximating it. Notable lodash semantics the previous
 * hand-rolled version diverged on: arrays merge INDEX-WISE (deep per
 * element), they are not overwritten — `@site.navigation` is the
 * render-visible case (locked by test/engine/merge.test.ts).
 */
import _ from '../utils/lodash.ts';

export function mergeDeep(
  target: Record<string, unknown>,
  ...sources: Array<Record<string, unknown> | undefined>
): Record<string, unknown> {
  return _.merge(target, ...sources);
}
