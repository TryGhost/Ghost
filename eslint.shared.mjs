// Shared building blocks for workspace ESLint flat configs. Each export is a
// rule object, a helper, or a plugin definition. Workspaces import only the
// pieces they need; this file imports nothing from the eslint plugin ecosystem
// so consumers don't take transitive peer deps via it.

import path from 'node:path';

// === Rule sets ===

// Correctness baseline shared by every workspace flat config. Each rule is
// individually overridable in the consumer's `rules` block.
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

// TS-aware unused-vars: disables the base rule, enables the TS variant with
// args ignore pattern. Most TS workspaces want this.
export const tsUnusedVarsRule = {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {
        args: 'after-used',
        argsIgnorePattern: '^_',
        caughtErrors: 'none'
    }]
};

// Vanilla unused-vars with caughtErrors:'none' — ESLint 9 flipped the default
// to 'all'. For non-TS workspaces where the previous behavior is wanted.
export const jsUnusedVarsRule = {
    'no-unused-vars': ['error', {caughtErrors: 'none'}]
};

// Import-sort autofix from eslint-plugin-ghost.
export const sortImportsRule = {
    'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
        memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
    }]
};

// Block barrel imports of @tryghost/shade; consumers must import from layered
// subpaths. Used by admin-x-* / posts / activitypub / admin host.
export const shadeLayeredImportsRule = {
    'no-restricted-imports': ['error', {
        paths: [{
            name: '@tryghost/shade',
            message: 'Import from layered subpaths instead (components/primitives/patterns/utils/app/tokens).'
        }]
    }]
};

// React rule defaults turned off across React workspaces.
export const reactDefaultsOff = {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off'
};

// React stylistic + correctness preferences applied across the React workspaces.
export const reactStrictRules = {
    'react/jsx-sort-props': ['error', {
        reservedFirst: true,
        callbacksLast: true,
        shorthandLast: true,
        locale: 'en'
    }],
    'react/button-has-type': 'error',
    'react/no-array-index-key': 'error',
    'react/jsx-key': 'off'
};

// Tailwind v4 ruleset using settings-based config (consumer sets
// `settings.tailwindcss.config`). For v3 workspaces use tailwindRulesWithConfig().
// All rules are 'error' or 'off' — Ghost's stance is no warnings (warnings
// get ignored and pollute context). migration-from-tailwind-2 is off since
// Ghost is already on v4; the rule is no longer providing value.
export const tailwindRulesV4 = {
    'tailwindcss/classnames-order': 'error',
    'tailwindcss/enforces-negative-arbitrary-values': 'error',
    'tailwindcss/enforces-shorthand': 'error',
    'tailwindcss/migration-from-tailwind-2': 'off',
    'tailwindcss/no-arbitrary-value': 'off',
    'tailwindcss/no-custom-classname': 'off',
    'tailwindcss/no-contradicting-classname': 'error'
};

// Tailwind v3 ruleset with config passed per-rule (v3 didn't read `settings`
// the same way). Use the consumer's tailwind config absolute path. Same
// error-or-off stance as tailwindRulesV4.
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

// === Profile presets ===
//
// Composite rule sets a workspace can spread wholesale. Every rule resolves
// to 'error' or 'off' — no 'warn' anywhere. Rules that would surface real
// violations were left 'off' (drop) rather than 'error' (fix). Decisions are
// data-driven: a rule is 'error' only if it has 0 incidences across the
// workspaces in its profile.

// Profile A: TypeScript React app — universal subset (works in any TS React
// workspace regardless of which React-adjacent plugins it registers).
// Compose with `viteTsReactExtras` if the workspace also loads
// eslint-plugin-react-hooks + eslint-plugin-react-refresh.
export const tsReactAppRules = {
    ...correctnessRules,
    ...tsUnusedVarsRule,
    ...reactDefaultsOff,
    'react/jsx-sort-props': ['error', {
        reservedFirst: true,
        callbacksLast: true,
        shorthandLast: true,
        locale: 'en'
    }],
    'react/button-has-type': 'error',
    'react/no-array-index-key': 'error',
    'react/jsx-key': 'off',
    'no-var': 'error',
    // TS handles these at compile time.
    'no-undef': 'off',
    'no-redeclare': 'off',
    'no-unexpected-multiline': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    // Enforced — @typescript-eslint/no-explicit-any catches real type-safety
    // regressions. Workspaces with legacy violations override to 'off'
    // explicitly (admin-x-settings: 2 cases, comments-ui: 41 cases).
    '@typescript-eslint/no-explicit-any': 'error',
    // Dropped — each surfaces 100+ existing violations across consumers.
    // Workspaces wanting these enforced should override per-rule to 'error'.
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-empty-function': 'off'
};

// Extras for Vite-based TS React apps with eslint-plugin-react-hooks +
// eslint-plugin-react-refresh registered as plugins. Both rules are dropped
// to 'off' (each surfaces existing violations across consumers).
export const viteTsReactExtras = {
    'react-hooks/exhaustive-deps': 'off',
    'react-refresh/only-export-components': 'off'
};

// Profile B: vanilla JS React app (portal, sodo-search, announcement-bar).
export const jsReactAppRules = {
    ...correctnessRules,
    ...jsUnusedVarsRule,
    ...reactDefaultsOff,
    'no-var': 'error'
};

// Profile D: backend Node library (ghost/i18n, ghost/parse-email-address;
// ghost/core spreads this in its base block too).
export const nodeLibRules = {
    ...correctnessRules,
    'no-var': 'error',
    'one-var': ['error', 'never'],
    'ghost/ghost-custom/no-native-error': 'error',
    'ghost/ghost-custom/ghost-error-usage': 'error',
    'ghost/ghost-custom/ghost-tpl-usage': 'error'
};

// Restricted-require rule blocking ghost-ignition imports — used by
// ghost/i18n. Kept as its own export since it's not universal.
export const noGhostIgnitionRequireRule = {
    'ghost/node/no-restricted-require': ['error', [
        {
            name: 'ghost-ignition',
            message: '@deprecated, please use @tryghost/errors, @tryghost/logging or @tryghost/debug. Config and Server are coming soon!'
        }
    ]]
};

// Strict linter options. Spread into a top-level config block (with `files`
// covering everything) so it applies workspace-wide. Sets unused-disable to
// 'off' — Ghost's stance is opinionated (error or off, no warns). The
// codebase has accumulated inline directives that flipping to 'error' would
// surface in bulk; promoting this to 'error' is a separate cleanup PR.
export const strictLinterOptions = {
    linterOptions: {
        reportUnusedDisableDirectives: 'off'
    }
};

// === Helpers ===

// Build an object that disables every `ghost/mocha/*` rule shipped by
// eslint-plugin-ghost. Used in test blocks so Vitest patterns don't trip
// false-positive mocha warnings. Pass the consumer's ghostPlugin.
export function mochaRulesOff(ghostPlugin) {
    return Object.fromEntries(
        Object.keys(ghostPlugin.rules || {})
            .filter(rule => rule.startsWith('mocha/'))
            .map(rule => [`ghost/${rule}`, 'off'])
    );
}

// === Plugins ===

// eslint-plugin-filenames-ts@1.3.2's match-regex rule calls context.getScope(),
// which ESLint 9 removed. Minimal replacement: filename check + optional
// ignoreExporting via AST scan (no scope traversal). Use under the
// 'local-filenames' plugin name. Compatible with the three call sites that
// previously defined their own shim (ghost/core, ghost/admin, ghost/i18n).
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
