// The React-app ESLint factory for internal Ghost frontend apps.
//
// Split out from `@internal/cfg-eslint` so a Node lib never loads the React
// plugin set. Because every plugin it needs is a static import (declared as this
// package's own dependencies), `reactAppConfig` is SYNCHRONOUS. The conditional
// options (reactRefresh, i18next, storybook, tailwind) just choose whether to
// *use* an already-loaded plugin — loading an unused plugin is cheap.
//
// Shared atoms come from the base package (`@internal/cfg-eslint`).

import {createRequire} from 'node:module';
import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import * as tseslint from 'typescript-eslint';
import reactRefreshPluginImport from 'eslint-plugin-react-refresh';
import tailwindcssPluginV4 from 'eslint-plugin-tailwindcss';
import i18nextPluginImport from 'eslint-plugin-i18next';
import storybookPluginImport from 'eslint-plugin-storybook';
import {
    jsReactAppRules,
    mochaRulesOff,
    shadeLayeredImportsRule,
    sortImportsRule,
    strictLinterOptions,
    tailwindRulesV4,
    tailwindRulesWithConfig,
    tsReactAppRules,
    viteOnlyExtras
} from '@internal/cfg-eslint';

/**
 * Options for {@link reactAppConfig}.
 *
 * @typedef {object} ReactAppConfigOptions
 * @property {boolean} [typescript=true]
 *   When false: vanilla JS app, no typescript-eslint extends, no
 *   @typescript-eslint/* rules. LEGACY for sodo-search and announcement-bar
 *   (should migrate to TS eventually).
 * @property {boolean} [reactRefresh=true]
 *   When false: skip eslint-plugin-react-refresh. Set false for UMD-bundled
 *   apps (comments-ui, signup-form) and vanilla JS apps — react-refresh is a
 *   Vite-HMR rule that's meaningless without Vite's HMR runtime.
 * @property {boolean} [i18next=false]
 *   When true: apply eslint-plugin-i18next's flat/recommended preset.
 * @property {'plugin' | 'storiesBlock' | null} [storybook=null]
 *   - `'plugin'`: applies eslint-plugin-storybook's full flat/recommended
 *     ruleset (story-exports check, prefer-pascal-case, hierarchy-separator,
 *     no-redundant-story-name, etc.) — this is what you want for any workspace
 *     with a proper Storybook setup. Used by shade.
 *   - `'storiesBlock'`: a minimal escape hatch — adds just one rule override
 *     (`react-hooks/rules-of-hooks: 'off'`) scoped to `**\/*.stories.*` files,
 *     for workspaces that have Storybook stories but don't want the full
 *     storybook ruleset. Used by admin-x-design-system.
 *   - `null` (default): skip Storybook handling entirely.
 * @property {string} [tailwindCssPath]
 *   Absolute path to a Tailwind v4 CSS config. Omit to skip Tailwind. Setting
 *   both this and `legacyTailwindV3ConfigPath` throws. NOTE: the workspace
 *   must also have `tailwindcss` as a (dev)Dependency — the
 *   eslint-plugin-tailwindcss settings-based resolver requires it locally.
 * @property {string} [legacyTailwindV3ConfigPath]
 *   LEGACY escape hatch. Absolute path to a Tailwind v3 JS/CJS config. Used by
 *   comments-ui and signup-form until they migrate to v4. The migration
 *   involves theme token rewrites + class rewrites + CDN regression testing
 *   (multi-day, blocked on no owner) so the rest of the codebase isn't held up.
 * @property {boolean} [shadeRestricted=false]
 *   When true: block barrel imports of `@tryghost/shade` (force layered subpath
 *   imports). Only relevant for workspaces that import shade.
 * @property {boolean} [sortImports=false]
 *   When true: apply `ghost/sort-imports-es6-autofix/sort-imports-es6`.
 * @property {boolean} [legacyJsTsSplit=false]
 *   LEGACY escape hatch for portal only. Portal is mid-TS-migration with both
 *   `.js` and `.ts` source files mixed in `src/`. When true, emits two src
 *   blocks: one for `src/**\/*.{js,jsx}` (vanilla rules) and one for
 *   `src/**\/*.{ts,tsx}` (TS rules + project: './tsconfig.json'). Remove when
 *   portal's JS files are fully migrated to TS. When used, pass
 *   `tsconfigRootDir: import.meta.dirname` so the TS block resolves
 *   `tsconfig.json` from the workspace, not the factory's directory.
 * @property {string} [tsconfigRootDir]
 *   Workspace directory containing `tsconfig.json` for type-aware lint blocks.
 *   Only consulted when `legacyJsTsSplit: true`. Defaults to `process.cwd()`
 *   (works when ESLint is invoked from the workspace directory, which is the
 *   `pnpm --filter ... exec eslint` pattern).
 * @property {string[]} [ignores=['dist/**\/*']]
 *   Extra ignore globs (replaces the default — pass an array including your
 *   defaults).
 * @property {string[]} [srcGlobs]
 *   Override src globs. Default depends on typescript flag: TS uses
 *   `['src/**\/*.{js,ts,cjs,tsx}']`; vanilla JS uses `['src/**\/*.{js,jsx}']`.
 * @property {string[]} [testGlobs]
 *   Override test globs. Default mirrors `srcGlobs` for the `test/` directory.
 *   Pass `false` to skip the test block entirely (some UMD apps lint a single
 *   src+test combined block via `srcGlobs`).
 * @property {object} [extraSrcRules]
 *   Per-workspace rule overrides for the src block (highest precedence).
 * @property {object} [extraTestRules]
 *   Per-workspace rule overrides for the test block.
 */

/**
 * Build a flat ESLint config for a frontend React app.
 *
 * @param {ReactAppConfigOptions} [options]
 * @returns {import('eslint').Linter.Config[]}
 *
 * @example
 * // apps/<app>/eslint.config.js — Vite TS React + Tailwind v4 + shade restriction
 * import {reactAppConfig} from '@internal/cfg-eslint-react';
 * export default reactAppConfig({
 *   tailwindCssPath: `${import.meta.dirname}/../admin/src/index.css`,
 *   shadeRestricted: true
 * });
 *
 * @example
 * // apps/announcement-bar/eslint.config.js — vanilla JS React
 * import {reactAppConfig} from '@internal/cfg-eslint-react';
 * export default reactAppConfig({
 *   typescript: false,
 *   reactRefresh: false,
 *   ignores: ['umd/**\/*', 'dist/**\/*']
 * });
 */
const REACT_APP_PARAMS = new Set([
    'typescript', 'reactRefresh', 'i18next', 'storybook', 'tailwindCssPath',
    'legacyTailwindV3ConfigPath', 'shadeRestricted', 'sortImports',
    'legacyJsTsSplit', 'tsconfigRootDir', 'ignores', 'srcGlobs', 'testGlobs',
    'extraSrcRules', 'extraTestRules'
]);

export function reactAppConfig(options = {}) {
    const unknown = Object.keys(options).filter(k => !REACT_APP_PARAMS.has(k));
    if (unknown.length) {
        throw new Error(`reactAppConfig: unknown options ${JSON.stringify(unknown)}. Valid keys: ${JSON.stringify([...REACT_APP_PARAMS])}`);
    }
    const {
        typescript = true,
        reactRefresh = true,
        i18next = false,
        storybook = null,
        tailwindCssPath,
        legacyTailwindV3ConfigPath,
        shadeRestricted = false,
        sortImports = false,
        legacyJsTsSplit = false,
        tsconfigRootDir,
        ignores = ['dist/**/*'],
        srcGlobs,
        testGlobs,
        extraSrcRules = {},
        extraTestRules = {}
    } = options;
    if (tailwindCssPath && legacyTailwindV3ConfigPath) {
        throw new Error('reactAppConfig: pass either tailwindCssPath (v4) or legacyTailwindV3ConfigPath (v3), not both.');
    }
    if (legacyJsTsSplit && !typescript) {
        throw new Error('reactAppConfig: legacyJsTsSplit requires typescript: true (the TS block uses tseslint).');
    }
    if (legacyJsTsSplit && (srcGlobs || testGlobs !== undefined)) {
        // The split branch hardcodes its file globs by extension (.js,.jsx vs
        // .ts,.tsx) — if a consumer passes srcGlobs/testGlobs we'd silently
        // ignore them. Throw rather than confuse.
        throw new Error('reactAppConfig: legacyJsTsSplit does not honor srcGlobs/testGlobs; they would be silently dropped.');
    }
    if (shadeRestricted && extraSrcRules['no-restricted-imports']) {
        // Setting both would silently replace the shade restriction with the
        // user's rule (last-key-wins on spread). If a workspace needs both,
        // add the user's paths to shadeLayeredImportsRule via a custom
        // `no-restricted-imports` value that includes both shade + the
        // workspace's paths. Throwing rather than silently losing the shade
        // restriction (which is security-shaped).
        throw new Error('reactAppConfig: shadeRestricted + extraSrcRules[\'no-restricted-imports\'] would silently override the shade restriction. Merge them in your workspace config.');
    }

    // Plugins are statically imported at module load. The conditionals below
    // pick whether to register/use each optional one.
    // typescript-eslint is always available because we use its `config()` helper
    // to flatten the `extends:` key (vanilla ESLint flat config doesn't support
    // `extends:` natively).
    const reactRefreshPlugin = reactRefresh ? reactRefreshPluginImport : null;
    // The v4 lane resolves the plugin from this package (main catalog). The
    // legacy v3 lane must resolve it from the app instead: importing the root's
    // 4.x plugin, whose rules take no per-rule options, would hard-fail ESLint
    // schema validation on the v3-style {config} options. The v3 apps pin
    // eslint-plugin-tailwindcss via catalog:tailwind3 precisely for this, and
    // the tailwind config path lives in the app dir.
    const tailwindcssPlugin = legacyTailwindV3ConfigPath
        ? createRequire(legacyTailwindV3ConfigPath)('eslint-plugin-tailwindcss')
        : (tailwindCssPath ? tailwindcssPluginV4 : null);
    const i18nextPlugin = i18next ? i18nextPluginImport : null;
    const storybookPlugin = storybook === 'plugin' ? storybookPluginImport : null;

    const reactFlat = reactPlugin.configs.flat.recommended;
    const reactJsxRuntime = reactPlugin.configs.flat['jsx-runtime'];
    const i18nextFlat = i18nextPlugin?.configs['flat/recommended'];

    const defaultTsSrcGlobs = ['src/**/*.{js,ts,cjs,tsx}'];
    const defaultJsSrcGlobs = ['src/**/*.{js,jsx}'];
    const defaultTsTestGlobs = ['test/**/*.{js,ts,cjs,tsx}'];
    const defaultJsTestGlobs = ['test/**/*.{js,jsx}'];

    const baseLanguageOptions = {
        ...reactFlat.languageOptions,
        ecmaVersion: 2022,
        sourceType: 'module',
        globals: {...globals.browser, ...globals.node}
    };

    const basePlugins = {
        ...reactFlat.plugins,
        ...(i18nextFlat?.plugins ?? {}),
        ghost: ghostPlugin,
        'react-hooks': reactHooksPlugin,
        ...(reactRefreshPlugin && {'react-refresh': reactRefreshPlugin}),
        ...(tailwindcssPlugin && {tailwindcss: tailwindcssPlugin})
    };

    const baseSettings = {
        react: {version: 'detect'},
        ...(tailwindCssPath && {tailwindcss: {cssConfigPath: tailwindCssPath}})
    };

    const tailwindRules = tailwindCssPath
        ? tailwindRulesV4
        : (legacyTailwindV3ConfigPath ? tailwindRulesWithConfig(legacyTailwindV3ConfigPath) : {});

    // Shared rule layers for any src block (TS or JS variant overlays on top).
    const baseSrcRules = {
        ...js.configs.recommended.rules,
        ...reactFlat.rules,
        ...(i18nextFlat?.rules ?? {}),
        ...reactHooksPlugin.configs.recommended.rules,
        // TODO: ~46 legacy violations (~24 across Vite TS apps + 22 in
        // comments-ui surfaced when react-hooks plugin was added there + 1 in
        // announcement-bar). Real bug-catcher (missing useEffect/useMemo deps);
        // cleanup PR will fix per-call-site and flip this to 'error'. Until
        // then 'off' is intentional — the plugin's default is 'warn' which
        // Ghost's stance forbids.
        'react-hooks/exhaustive-deps': 'off',
        ...(reactRefresh ? viteOnlyExtras : {}),
        ...(shadeRestricted ? shadeLayeredImportsRule : {}),
        ...(sortImports ? sortImportsRule : {}),
        ...tailwindRules
    };

    // Build src block(s). legacyJsTsSplit produces two src blocks
    // (one .js, one .ts); everything else produces one.
    const srcBlocks = [];

    if (legacyJsTsSplit) {
        // Portal — split blocks. The validator above guarantees srcGlobs and
        // testGlobs are not set when legacyJsTsSplit is true.
        srcBlocks.push({
            files: ['src/**/*.{js,jsx}', 'test/**/*.{js,jsx}'],
            ...js.configs.recommended,
            languageOptions: {
                ...reactFlat.languageOptions,
                ecmaVersion: 2022,
                sourceType: 'module',
                globals: {
                    ...globals.browser,
                    ...globals.vitest,
                    ...globals.jest,
                    vi: 'readonly',
                    require: 'readonly'
                }
            },
            plugins: basePlugins,
            settings: baseSettings,
            rules: {
                ...baseSrcRules,
                ...reactJsxRuntime.rules,
                ...jsReactAppRules,
                ...extraSrcRules
            }
        });
        srcBlocks.push({
            files: ['src/**/*.{ts,tsx}', 'test/**/*.{ts,tsx}'],
            extends: [...tseslint.configs.recommended],
            languageOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                parserOptions: {
                    ecmaFeatures: {jsx: true},
                    project: './tsconfig.json',
                    // BUG-FIX: was `import.meta.dirname` which resolves to the
                    // factory's directory (repo root), not the workspace.
                    tsconfigRootDir: tsconfigRootDir ?? process.cwd()
                },
                globals: {
                    ...globals.browser,
                    ...globals.vitest,
                    ...globals.jest,
                    vi: 'readonly'
                }
            },
            plugins: basePlugins,
            settings: baseSettings,
            rules: {
                ...baseSrcRules,         // includes js.recommended + reactFlat + i18nextFlat + react-hooks + viteOnlyExtras + tailwindRules
                ...reactJsxRuntime.rules,
                ...tsReactAppRules,      // TS branch needs TS-safe defaults (no-undef: off, no-explicit-any: error, react strict rules)
                ...extraSrcRules
            }
        });
    } else if (typescript) {
        srcBlocks.push({
            files: srcGlobs ?? defaultTsSrcGlobs,
            extends: [...tseslint.configs.recommended],
            languageOptions: baseLanguageOptions,
            plugins: basePlugins,
            settings: baseSettings,
            rules: {
                ...baseSrcRules,
                ...tsReactAppRules,
                ...extraSrcRules
            }
        });
    } else {
        // Vanilla JS (sodo-search, announcement-bar). LEGACY: should migrate to TS.
        srcBlocks.push({
            files: srcGlobs ?? defaultJsSrcGlobs,
            ...js.configs.recommended,
            languageOptions: {
                ...reactFlat.languageOptions,
                ecmaVersion: 2022,
                sourceType: 'module',
                globals: globals.browser
            },
            plugins: basePlugins,
            settings: baseSettings,
            rules: {
                ...baseSrcRules,
                ...jsReactAppRules,
                ...extraSrcRules
            }
        });
    }

    // Test block — skipped if testGlobs === false.
    const testBlocks = [];
    if (testGlobs !== false && !legacyJsTsSplit) {
        const resolvedTestGlobs = testGlobs ?? (typescript ? defaultTsTestGlobs : defaultJsTestGlobs);
        const testLanguageOptions = typescript
            ? {
                ecmaVersion: 2022,
                sourceType: 'module',
                globals: {
                    ...globals.browser,
                    ...globals.node,
                    ...globals.vitest,
                    vi: 'readonly'
                }
            }
            : {
                ...reactFlat.languageOptions,
                ecmaVersion: 2022,
                sourceType: 'module',
                globals: {
                    ...globals.browser,
                    ...globals.vitest,
                    ...globals.jest,
                    vi: 'readonly'
                }
            };
        // Test blocks need the same plugins as src because the spread rules
        // (tsReactAppRules / jsReactAppRules) reference react/*, react-hooks/*,
        // etc. — ESLint flat config errors if a rule references a plugin not
        // registered in the same block.
        testBlocks.push({
            files: resolvedTestGlobs,
            ...(typescript ? {extends: [...tseslint.configs.recommended]} : js.configs.recommended),
            languageOptions: testLanguageOptions,
            plugins: basePlugins,
            settings: baseSettings,
            rules: {
                ...(typescript ? tsReactAppRules : {...js.configs.recommended.rules, ...reactFlat.rules, ...jsReactAppRules}),
                ...mochaRulesOff(ghostPlugin),
                ...extraTestRules
            }
        });
    }

    // Storybook handling (after src/test so storybook rules win for stories).
    const storybookBlocks = [];
    if (storybook === 'plugin') {
        storybookBlocks.push(...storybookPlugin.configs['flat/recommended']);
        storybookBlocks.push({
            files: ['**/*.stories.{ts,tsx,js,jsx,mjs,cjs}', '**/*.story.{ts,tsx,js,jsx,mjs,cjs}'],
            rules: {
                'storybook/hierarchy-separator': 'error',
                'storybook/no-redundant-story-name': 'error',
                'storybook/prefer-pascal-case': 'error'
            }
        });
    } else if (storybook === 'storiesBlock') {
        storybookBlocks.push({
            files: ['**/*.stories.{ts,tsx,js,jsx}'],
            rules: {'react-hooks/rules-of-hooks': 'off'}
        });
    }

    return tseslint.config(
        {ignores},
        {files: ['**/*'], ...strictLinterOptions},
        ...srcBlocks,
        ...storybookBlocks,
        ...testBlocks
    );
}
