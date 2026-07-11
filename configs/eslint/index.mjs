// Shared ESLint atoms + the Node-library factory for internal Ghost packages.
//
// This is the base of the `@internal/cfg-eslint*` config packages. It holds the
// atomic rule objects/helpers (also consumed by the React factory and by the
// standalone workspaces) and a SYNCHRONOUS `nodeLibConfig`. It can be sync
// because it statically imports only the plugins a Node lib needs — declared as
// this package's own dependencies. The React factory lives in
// `@internal/cfg-eslint-react` so a Node lib never loads the React plugin set.
//
// Every rule is 'error' or 'off' — never 'warn'. Warnings get ignored by humans
// and agents and just pollute lint output.

import path from 'node:path';
import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import * as tseslint from 'typescript-eslint';

// ============================================================================
// === Atomic rule objects (composed inside factories; also exported for the
// === standalone workspaces that don't fit a factory, and for the React factory)
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

// Ban top-level await in shipped Node-library source. It makes the ESM module
// graph async, which breaks CommonJS consumers (e.g. ghost/core) that load an
// ESM package via `require()`: require(esm) can't load an async graph and
// throws ERR_REQUIRE_ASYNC_MODULE. Awaits inside functions are fine; only
// module-level ones are the problem. Applied to src blocks only — test files
// are never require()d.
export const noTopLevelAwaitRule = {
    'no-restricted-syntax': ['error',
        {
            selector: 'AwaitExpression:not(:function AwaitExpression)',
            message: 'Top-level await is not allowed — it breaks require(esm) consumers like ghost/core. Move it inside an async function.'
        },
        {
            selector: 'ForOfStatement[await=true]:not(:function ForOfStatement)',
            message: 'Top-level for-await-of is not allowed — it breaks require(esm) consumers like ghost/core. Move it inside an async function.'
        }
    ]
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
export function mochaRulesOff(plugin) {
    return Object.fromEntries(
        Object.keys(plugin.rules || {})
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
// === Factory: nodeLibConfig (synchronous)
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
 * @returns {import('eslint').Linter.Config[]}
 *
 * @example
 * // packages/parse-email-address/eslint.config.mjs — TS Node lib
 * import {nodeLibConfig} from '@internal/cfg-eslint';
 * export default nodeLibConfig();
 */
const NODE_LIB_PARAMS = new Set([
    'typescript', 'commonjs', 'legacyLocalFilenames', 'srcGlobs', 'testGlobs',
    'ignores', 'extraSrcRules', 'extraTestRules', 'extraBlocks'
]);

export function nodeLibConfig(options = {}) {
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
            ...noTopLevelAwaitRule,
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
