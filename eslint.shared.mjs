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
export const tailwindRulesV4 = {
    'tailwindcss/classnames-order': 'error',
    'tailwindcss/enforces-negative-arbitrary-values': 'warn',
    'tailwindcss/enforces-shorthand': 'warn',
    'tailwindcss/migration-from-tailwind-2': 'warn',
    'tailwindcss/no-arbitrary-value': 'off',
    'tailwindcss/no-custom-classname': 'off',
    'tailwindcss/no-contradicting-classname': 'error'
};

// Tailwind v3 ruleset with config passed per-rule (v3 didn't read `settings`
// the same way). Use the consumer's tailwind config absolute path.
export function tailwindRulesWithConfig(config) {
    return {
        'tailwindcss/classnames-order': ['error', {config}],
        'tailwindcss/enforces-negative-arbitrary-values': ['warn', {config}],
        'tailwindcss/enforces-shorthand': ['warn', {config}],
        'tailwindcss/migration-from-tailwind-2': ['warn', {config}],
        'tailwindcss/no-arbitrary-value': 'off',
        'tailwindcss/no-custom-classname': 'off',
        'tailwindcss/no-contradicting-classname': ['error', {config}]
    };
}

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
