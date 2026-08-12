import {describe, expect, it} from 'vitest';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

/**
 * The guarantee this whole feature rests on: the Labs panel is absent from a
 * production bundle, not merely guarded inside one. `import.meta.env.DEV` is a
 * compile-time constant, so the ternary in app.tsx folds and Rollup drops the
 * lazy chunk — but that is an inference about the bundler, and this asserts it.
 *
 * Free to run: nx.json makes admin's `test:unit` depend on `build`, so dist/ is
 * already present (built or cache-restored) whenever this suite runs in CI. The
 * precedent is apps/admin-toolbar, whose tests also read their build output.
 *
 * That dependency is what makes the result trustworthy. Run locally against a
 * dist/ built an hour ago, this passes on stale output and says nothing about
 * the code as it stands — build first if you are checking by hand.
 */
const DIST_ASSETS = join(dirname(fileURLToPath(import.meta.url)), '../../../dist/assets');

/**
 * String literals a minifier preserves, none of which appears in the admin for
 * any other reason. The panel's flask icon would not do: it is also the real
 * Settings nav icon, so it is present either way and would make this pass —
 * or fail — for the wrong reason.
 *
 * PUBLIC_BETA_FEATURES is the most serious of the three. Its presence would mean
 * the ?raw text of ghost/core/core/shared/labs.js had been inlined into a
 * customer-facing bundle.
 */
const SENTINELS = ['ghost-labs-panel', 'PUBLIC_BETA_FEATURES', 'devLabsPanel'];

describe('the dev Labs panel', () => {
    it('leaves no trace in the production build', (context) => {
        if (!existsSync(DIST_ASSETS)) {
            // Skipping silently would make this a no-op in exactly the case people
            // hit locally, so it is announced — and never skipped where it counts.
            if (process.env.CI) {
                throw new Error(`No build output at ${DIST_ASSETS}. This assertion cannot be skipped in CI.`);
            }

            context.skip(`no build output at ${DIST_ASSETS} — run \`pnpm build\` to check locally`);
            return;
        }

        const scripts = readdirSync(DIST_ASSETS).filter(file => file.endsWith('.js'));

        // Load-bearing, not a warm-up: with no chunks to read, the search below
        // finds nothing and the whole assertion passes for the wrong reason.
        expect(scripts.length).toBeGreaterThan(0);

        // Every chunk, not just the entry: a regression would most likely land in
        // a split chunk.
        const offenders = scripts.filter((file) => {
            const contents = readFileSync(join(DIST_ASSETS, file), 'utf8');

            return SENTINELS.some(sentinel => contents.includes(sentinel));
        });

        // If this fails locally, check the shared folder before suspecting the
        // build: vite-ember-assets.ts copies ghost/core/core/built/admin/assets
        // into dist/assets, so a development-mode build done at any point in the
        // past leaves a bundle there that every later build copies back in. CI
        // builds from a clean checkout, where that folder only holds Ember output.
        expect(offenders, 'Also check ghost/core/core/built/admin/assets for a stale development-mode bundle').toEqual([]);
    });
});
