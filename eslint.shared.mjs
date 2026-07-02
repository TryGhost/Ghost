// Shared ESLint config for Ghost workspaces.
//
// ============================================================================
// Strategy: every rule is 'error' or 'off' — never 'warn'. Warnings get
// ignored by humans and agents and just pollute lint output.
// ============================================================================
//
// Two factories cover most workspaces. Hover the factory call in your editor
// for full JSDoc on every param.
//
//   reactAppConfig({...})  — every frontend React app (apps/*)
//   nodeLibConfig({...})   — Node libs (ghost/i18n, ghost/parse-email-address)
//
// Decision tree:
//   Frontend React app (apps/*)        → reactAppConfig
//   Node lib (ghost/i18n, parse-...)   → nodeLibConfig
//   Everything else                    → standalone (see "Standalone workspaces" below)
//
// Standalone workspaces (don't use a factory — read the file directly):
//   ghost/core         — 13 file-glob blocks for migrations, schema, frontend/server seam
//   ghost/admin        — Ember workspace, 90+ ember-plugin rules, babel parser
//   apps/admin         — host shell, recommendedTypeChecked posture, custom local plugins
//   apps/admin-toolbar — pure jQuery vanilla JS, no React (could compose from atoms but tiny)
//
// `legacy*` params are escape hatches for known migrations that aren't worth
// blocking config on (e.g. Tailwind v3 → v4, JS → TS finish). They're
// intentionally named `legacy` so PRs to remove them are scoped and visible.

import path from 'node:path';
import {createRequire} from 'node:module';

// ============================================================================
// === Atomic rule objects (composed inside factories; also exported for the
// === standalone workspaces that don't fit a factory)
// ============================================================================

export const correctnessRules = {
    curly: 'error',
    camelcase: ['error', {properties: 'never'}],
    'dot-notation': 'error',
    eqeqeq: ['error', 'always'],
    'no-plusplus': ['error', {allowForLoopAfterthoughts: true}],
    'no-eval': 'error',
    'no-useless-call': 'error',
    'no-console': 'error',
    'no-shadow': 'error',
    'array-callback-return': 'error',
    'no-constructor-return': 'error',
    'no-promise-executor-return': 'error',
    'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', false]
};

export const tsUnusedVarsRule = {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {
        args: 'after-used',
        argsIgnorePattern: '^_',
        caughtErrors: 'none'
    }]
};

// ESLint 9 flipped the no-unused-vars default for caughtErrors from 'none' to
// 'all'. Restore the previous behavior so unused catch bindings stay tolerated.
export const jsUnusedVarsRule = {
    'no-unused-vars': ['error', {caughtErrors: 'none'}]
};

export const sortImportsRule = {
    'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
        memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
    }]
};

export const shadeLayeredImportsRule = {
    'no-restricted-imports': ['error', {
        paths: [{
            name: '@tryghost/shade',
            message: 'Import from layered subpaths instead (components/primitives/patterns/utils/app/tokens).'
        }]
    }]
};

export const reactDefaultsOff = {
    'react/react-in-jsx-scope': 'off',  // not needed with the new JSX transform
    'react/prop-types': 'off'           // codebase uses TypeScript for prop typing
};

export const reactStrictRules = {
    'react/jsx-sort-props': ['error', {
        reservedFirst: true,
        callbacksLast: true,
        shorthandLast: true,
        locale: 'en'
    }],
    'react/button-has-type': 'error',
    'react/no-array-index-key': 'error',
    'react/jsx-key': 'error'
};

// Tailwind v4 ruleset (settings-based config).
export const tailwindRulesV4 = {
    'tailwindcss/classnames-order': 'error',
    'tailwindcss/enforces-negative-arbitrary-values': 'error',
    'tailwindcss/enforces-shorthand': 'error',
    'tailwindcss/migration-from-tailwind-2': 'off',  // already on v4; rule is a v2 migration helper
    'tailwindcss/no-arbitrary-value': 'off',          // intentionally allowed
    'tailwindcss/no-custom-classname': 'off',         // codebase relies on custom classnames
    'tailwindcss/no-contradicting-classname': 'error'
};

// Tailwind v3 ruleset (per-rule config). LEGACY — used only by comments-ui
// and signup-form until they migrate to v4.
export function tailwindRulesWithConfig(config) {
    return {
        'tailwindcss/classnames-order': ['error', {config}],
        'tailwindcss/enforces-negative-arbitrary-values': ['error', {config}],
        'tailwindcss/enforces-shorthand': ['error', {config}],
        'tailwindcss/migration-from-tailwind-2': 'off',
        'tailwindcss/no-arbitrary-value': 'off',
        'tailwindcss/no-custom-classname': 'off',
        'tailwindcss/no-contradicting-classname': ['error', {config}]
    };
}

// Composite rule sets used by factories. Every rule is 'error' or 'off' —
// never 'warn'. Rules at 'off' have inline TODOs with violation counts so
// re-enabling them is a scoped cleanup PR.

export const tsReactAppRules = {
    ...correctnessRules,
    ...tsUnusedVarsRule,
    ...reactDefaultsOff,
    ...reactStrictRules,
    // Apply react-hooks rules at the rule-set level so they cover BOTH src and
    // test blocks. The src block ALSO extends reactHooks.configs.recommended-latest
    // which is fine — these match. exhaustive-deps stays off everywhere; the
    // workspace-specific overrides for src already handle TODO counts.
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'off',
    'no-var': 'error',
    // TS handles these at compile time; turning them off in ESLint avoids
    // duplicate/contradictory reports.
    'no-undef': 'off',
    'no-redeclare': 'off',
    'no-unexpected-multiline': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    // Catches real type-safety regressions. Workspaces with legacy violations
    // override to 'off' explicitly (admin-x-settings: 2, comments-ui: 41).
    '@typescript-eslint/no-explicit-any': 'error',
    // TODO: 97 violations across 8 workspaces. Cleanup PR will flip to 'error'.
    '@typescript-eslint/no-non-null-assertion': 'off',
    // TODO: 121 violations across all 9 TS React workspaces. Cleanup PR will flip to 'error'.
    '@typescript-eslint/no-empty-function': 'off'
};

// Extras for Vite-based apps with eslint-plugin-react-refresh registered.
// (react-hooks is loaded by every React app now, including UMD — react-refresh
// is the Vite-specific HMR rule.)
export const viteOnlyExtras = {
    // LEGACY: 195 violations across 7 Vite apps. The rule fires on any module
    // that exports a non-component alongside a component (utils, constants,
    // hooks). React/Vite patterns mix these constantly — fixing 195 cases means
    // splitting hundreds of files. Practically permanent; the rule's HMR
    // benefit doesn't justify the codebase upheaval.
    'react-refresh/only-export-components': 'off'
};

export const jsReactAppRules = {
    ...correctnessRules,
    ...jsUnusedVarsRule,
    ...reactDefaultsOff,
    'no-var': 'error'
};

export const nodeLibRules = {
    ...correctnessRules,
    'no-var': 'error',
    'one-var': ['error', 'never'],
    'ghost/ghost-custom/no-native-error': 'error',
    'ghost/ghost-custom/ghost-error-usage': 'error',
    'ghost/ghost-custom/ghost-tpl-usage': 'error'
};

export const noGhostIgnitionRequireRule = {
    'ghost/node/no-restricted-require': ['error', [
        {
            name: 'ghost-ignition',
            message: '@deprecated, please use @tryghost/errors, @tryghost/logging or @tryghost/debug. Config and Server are coming soon!'
        }
    ]]
};

export const strictLinterOptions = {
    linterOptions: {
        reportUnusedDisableDirectives: 'error'
    }
};

// ============================================================================
// === Helpers
// ============================================================================

// Disables every `ghost/mocha/*` rule. Used in test blocks so Vitest patterns
// don't trip false-positive mocha-style warnings.
export function mochaRulesOff(ghostPlugin) {
    return Object.fromEntries(
        Object.keys(ghostPlugin.rules || {})
            .filter(rule => rule.startsWith('mocha/'))
            .map(rule => [`ghost/${rule}`, 'off'])
    );
}

// ============================================================================
// === Plugins
// ============================================================================

// ESLint-9-compatible replacement for eslint-plugin-filenames-ts's match-regex
// rule (the upstream calls context.getScope() which ESLint 9 removed).
const filenamesMatchRegex = {
    meta: {
        type: 'problem',
        schema: [
            {type: 'string'},
            {type: ['boolean', 'null']},
            {type: ['boolean', 'null']}
        ]
    },
    create(context) {
        const pattern = new RegExp(context.options[0]);
        const ignoreExporting = Boolean(context.options[1]);
        return {
            Program(node) {
                if (ignoreExporting) {
                    const hasExport = node.body.some(stmt =>
                        stmt.type === 'ExportDefaultDeclaration' ||
                        stmt.type === 'ExportNamedDeclaration' ||
                        (stmt.type === 'ExpressionStatement' &&
                         stmt.expression.type === 'AssignmentExpression' &&
                         stmt.expression.left.type === 'MemberExpression' &&
                         stmt.expression.left.object.type === 'Identifier' &&
                         stmt.expression.left.object.name === 'module' &&
                         stmt.expression.left.property.type === 'Identifier' &&
                         stmt.expression.left.property.name === 'exports')
                    );
                    if (hasExport) return;
                }
                const filename = path.parse(context.filename).name;
                if (!pattern.test(filename)) {
                    context.report({
                        node,
                        message: `Filename '${filename}' does not match the naming convention.`
                    });
                }
            }
        };
    }
};

export const localFilenamesPlugin = {
    rules: {'match-regex': filenamesMatchRegex}
};

// ============================================================================
// === Factory: reactAppConfig
// ============================================================================
//
// Single factory for every frontend React app in apps/*.

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
 *   When true: load eslint-plugin-i18next and apply its flat/recommended preset.
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
 * @returns {Promise<import('eslint').Linter.Config[]>}
 *
 * @example
 * // apps/posts/eslint.config.js — Vite TS React + Tailwind v4 + shade restriction
 * import {reactAppConfig} from '../../eslint.shared.mjs';
 * export default await reactAppConfig({
 *   tailwindCssPath: `${import.meta.dirname}/../admin/src/index.css`,
 *   shadeRestricted: true
 * });
 *
 * @example
 * // apps/comments-ui/eslint.config.js — UMD TS React + Tailwind v3 + i18next
 * import {reactAppConfig} from '../../eslint.shared.mjs';
 * export default await reactAppConfig({
 *   reactRefresh: false,
 *   legacyTailwindV3ConfigPath: `${import.meta.dirname}/tailwind.config.js`,
 *   i18next: true,
 *   sortImports: true,
 *   testGlobs: false,
 *   srcGlobs: ['src/**\/*.{js,jsx,ts,tsx}']
 * });
 *
 * @example
 * // apps/announcement-bar/eslint.config.js — vanilla JS React
 * import {reactAppConfig} from '../../eslint.shared.mjs';
 * export default await reactAppConfig({
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

export async function reactAppConfig(options = {}) {
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

    // Lazy-load plugins so a Node lib calling nodeLibConfig never loads React.
    // typescript-eslint is loaded unconditionally because we use its `config()`
    // helper to flatten the `extends:` key (vanilla ESLint flat config doesn't
    // support `extends:` natively).
    const [
        {default: js},
        {default: globals},
        {default: ghostPlugin},
        {default: reactPlugin},
        {default: reactHooksPlugin},
        tseslint
    ] = await Promise.all([
        import('@eslint/js'),
        import('globals'),
        import('eslint-plugin-ghost'),
        import('eslint-plugin-react'),
        import('eslint-plugin-react-hooks'),
        import('typescript-eslint')
    ]);

    const reactRefreshPlugin = reactRefresh
        ? (await import('eslint-plugin-react-refresh')).default
        : null;
    // The v4 lane resolves the plugin from the repo root (main catalog). The
    // legacy v3 lane must resolve it from the app instead: importing from this
    // file would load the root's 4.x plugin, whose rules take no per-rule
    // options and hard-fail ESLint schema validation on the v3-style {config}
    // options. The v3 apps pin eslint-plugin-tailwindcss via catalog:tailwind3
    // precisely for this, and the tailwind config path lives in the app dir.
    const tailwindcssPlugin = legacyTailwindV3ConfigPath
        ? createRequire(legacyTailwindV3ConfigPath)('eslint-plugin-tailwindcss')
        : (tailwindCssPath ? (await import('eslint-plugin-tailwindcss')).default : null);
    const i18nextPlugin = i18next
        ? (await import('eslint-plugin-i18next')).default
        : null;
    const storybookPlugin = storybook === 'plugin'
        ? (await import('eslint-plugin-storybook')).default
        : null;

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

// ============================================================================
// === Factory: nodeLibConfig
// ============================================================================

/**
 * Options for {@link nodeLibConfig}.
 *
 * @typedef {object} NodeLibConfigOptions
 * @property {boolean} [typescript=true]
 *   When true: extends tseslint.configs.recommended + tsUnusedVarsRule.
 *   When false: vanilla JS with jsUnusedVarsRule.
 * @property {boolean} [commonjs=false]
 *   When true: sourceType is 'commonjs' instead of 'module'.
 * @property {boolean} [legacyLocalFilenames=false]
 *   LEGACY escape hatch for ghost/i18n. When true: register the
 *   localFilenamesPlugin and turn off `ghost/filenames/match-regex` so the
 *   workspace can use `local-filenames/match-regex` (its workspace-local
 *   variant) instead. Should be unified with the rest of the codebase
 *   eventually so we only have one filename-matching rule.
 * @property {string[]} [srcGlobs]
 *   Override src globs. Default depends on typescript flag.
 * @property {string[]} [testGlobs]
 *   Override test globs. Pass `false` to skip the test block.
 * @property {string[]} [ignores=['build/**\/*']]
 *   Replace default ignore globs.
 * @property {object} [extraSrcRules]
 *   Per-workspace src rule overrides.
 * @property {object} [extraTestRules]
 *   Per-workspace test rule overrides.
 * @property {Array<import('eslint').Linter.Config>} [extraBlocks]
 *   Append extra config blocks (e.g. ghost/i18n's `max-lines` override on
 *   `lib/index.js`). Each block SHOULD set its own `files:` glob — flat config
 *   treats a block without `files:` as applying to all files, which is rarely
 *   what consumers want.
 */

/**
 * Build a flat ESLint config for a Node library.
 *
 * @param {NodeLibConfigOptions} [options]
 * @returns {Promise<import('eslint').Linter.Config[]>}
 *
 * @example
 * // ghost/parse-email-address/eslint.config.mjs — TS Node lib
 * import {nodeLibConfig} from '../../eslint.shared.mjs';
 * export default await nodeLibConfig();
 *
 * @example
 * // ghost/i18n/eslint.config.mjs — JS Node lib with local-filenames variant
 * import {nodeLibConfig, noGhostIgnitionRequireRule} from '../../eslint.shared.mjs';
 * export default await nodeLibConfig({
 *   typescript: false,
 *   commonjs: true,
 *   legacyLocalFilenames: true,
 *   srcGlobs: ['*.js', 'lib/**\/*.js'],
 *   extraSrcRules: noGhostIgnitionRequireRule,
 *   extraBlocks: [{
 *     files: ['lib/**\/index.js', 'index.js'],
 *     rules: {'max-lines': ['error', {skipBlankLines: true, skipComments: true, max: 50}]}
 *   }]
 * });
 */
const NODE_LIB_PARAMS = new Set([
    'typescript', 'commonjs', 'legacyLocalFilenames', 'srcGlobs', 'testGlobs',
    'ignores', 'extraSrcRules', 'extraTestRules', 'extraBlocks'
]);

export async function nodeLibConfig(options = {}) {
    const unknown = Object.keys(options).filter(k => !NODE_LIB_PARAMS.has(k));
    if (unknown.length) {
        throw new Error(`nodeLibConfig: unknown options ${JSON.stringify(unknown)}. Valid keys: ${JSON.stringify([...NODE_LIB_PARAMS])}`);
    }
    const {
        typescript = true,
        commonjs = false,
        legacyLocalFilenames = false,
        srcGlobs,
        testGlobs,
        ignores = ['build/**/*'],
        extraSrcRules = {},
        extraTestRules = {},
        extraBlocks = []
    } = options;
    const [
        {default: js},
        {default: globals},
        {default: ghostPlugin},
        tseslint
    ] = await Promise.all([
        import('@eslint/js'),
        import('globals'),
        import('eslint-plugin-ghost'),
        import('typescript-eslint')
    ]);

    const defaultTsSrcGlobs = ['src/**/*.ts'];
    const defaultJsSrcGlobs = ['*.js', 'lib/**/*.js'];
    const defaultTsTestGlobs = ['test/**/*.ts'];
    const defaultJsTestGlobs = ['test/**/*.js'];

    const sourceType = commonjs ? 'commonjs' : 'module';

    const unusedVarsRule = typescript ? tsUnusedVarsRule : jsUnusedVarsRule;
    const baseRules = {
        ...nodeLibRules,
        ...unusedVarsRule,
        // Turn off the eslint-plugin-ghost filename rule when using the
        // local-filenames variant — they're equivalent in intent.
        ...(legacyLocalFilenames ? {'ghost/filenames/match-regex': 'off'} : {})
    };

    const plugins = {
        ghost: ghostPlugin,
        ...(legacyLocalFilenames && {'local-filenames': localFilenamesPlugin})
    };

    const srcLanguageOptions = {
        ecmaVersion: 2022,
        sourceType,
        globals: globals.node
    };

    const testLanguageOptions = {
        ecmaVersion: 2022,
        sourceType,
        globals: {
            ...globals.node,
            ...globals.mocha,
            ...globals.vitest,
            vi: 'readonly',
            beforeAll: 'readonly',
            should: 'readonly',
            sinon: 'readonly'
        }
    };

    const srcBlock = {
        files: srcGlobs ?? (typescript ? defaultTsSrcGlobs : defaultJsSrcGlobs),
        ...(typescript ? {extends: [...tseslint.configs.recommended]} : js.configs.recommended),
        languageOptions: srcLanguageOptions,
        plugins,
        rules: {
            ...js.configs.recommended.rules,
            ...baseRules,
            ...(typescript ? {'no-undef': 'off'} : {}),
            ...extraSrcRules
        }
    };

    const testBlock = testGlobs === false ? null : {
        files: testGlobs ?? (typescript ? defaultTsTestGlobs : defaultJsTestGlobs),
        ...(typescript ? {extends: [...tseslint.configs.recommended]} : js.configs.recommended),
        languageOptions: testLanguageOptions,
        plugins,
        rules: {
            ...js.configs.recommended.rules,
            ...baseRules,
            ...mochaRulesOff(ghostPlugin),
            ...(typescript ? {'no-undef': 'off'} : {}),
            ...extraTestRules
        }
    };

    return tseslint.config(
        {ignores},
        {files: ['**/*'], ...strictLinterOptions},
        srcBlock,
        ...extraBlocks,
        ...(testBlock ? [testBlock] : [])
    );
}
