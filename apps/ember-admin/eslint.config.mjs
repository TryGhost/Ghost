import js from '@eslint/js';
import globals from 'globals';
import babelParser from '@babel/eslint-parser';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';

import {
    correctnessRules,
    jsUnusedVarsRule,
    localFilenamesPlugin,
    mochaRulesOff,
    strictLinterOptions
} from '@internal/cfg-eslint';

// ghost/admin uses local-filenames/match-regex (workspace-scoped, blocks
// below) instead of ghost/filenames/match-regex (from correctnessRules) — turn
// that one off here. no-unused-private-class-members is workspace-specific
// (ESLint 9 added it to recommended; codebase has intentional placeholders).
const ghostBaseRules = {
    ...correctnessRules,
    ...jsUnusedVarsRule,
    'ghost/filenames/match-regex': 'off',
    'no-unused-private-class-members': 'off'
};

const emberRules = {
    'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
        memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
    }],
    // Components
    'ghost/ember/no-attrs-in-components': 'error',
    'ghost/ember/no-attrs-snapshot': 'error',
    'ghost/ember/no-on-calls-in-components': 'error',
    // Computed Properties
    'ghost/ember/no-arrow-function-computed-properties': 'error',
    'ghost/ember/no-computed-properties-in-native-classes': 'error',
    'ghost/ember/no-deeply-nested-dependent-keys-with-each': 'error',
    'ghost/ember/no-duplicate-dependent-keys': 'error',
    'ghost/ember/no-incorrect-computed-macros': 'error',
    'ghost/ember/no-invalid-dependent-keys': 'error',
    'ghost/ember/no-side-effects': 'error',
    'ghost/ember/no-volatile-computed-properties': 'error',
    'ghost/ember/require-computed-macros': 'error',
    'ghost/ember/require-return-from-computed': 'error',
    'ghost/ember/use-brace-expansion': 'error',
    // Controllers
    'ghost/ember/alias-model-in-controller': 'error',
    'ghost/ember/avoid-using-needs-in-controllers': 'error',
    // Deprecations
    'ghost/ember/closure-actions': 'error',
    'ghost/ember/new-module-imports': 'error',
    'ghost/ember/no-function-prototype-extensions': 'error',
    'ghost/ember/no-observers': 'error',
    'ghost/ember/no-old-shims': 'error',
    'ghost/ember/no-string-prototype-extensions': 'error',
    // Ember Data
    'ghost/ember/use-ember-data-rfc-395-imports': 'error',
    // Ember Object
    'ghost/ember/avoid-leaking-state-in-ember-objects': 'error',
    'ghost/ember/no-get-with-default': 'error',
    'ghost/ember/no-try-invoke': 'error',
    'ghost/ember/require-super-in-lifecycle-hooks': 'error',
    // Octane
    'ghost/ember/classic-decorator-hooks': 'error',
    'ghost/ember/classic-decorator-no-classic-methods': 'error',
    'ghost/ember/no-ember-super-in-es-classes': 'error',
    'ghost/ember/no-empty-glimmer-component-classes': 'error',
    // jQuery
    'ghost/ember/jquery-ember-run': 'error',
    'ghost/ember/no-global-jquery': 'error',
    // Misc
    'ghost/ember/no-incorrect-calls-with-inline-anonymous-functions': 'error',
    'ghost/ember/no-invalid-debug-function-arguments': 'error',
    'ghost/ember/require-fetch-import': 'error',
    // Routes
    'ghost/ember/no-capital-letters-in-routes': 'error',
    'ghost/ember/no-private-routing-service': 'error',
    'ghost/ember/no-shadow-route-definition': 'error',
    'ghost/ember/no-unnecessary-index-route': 'error',
    'ghost/ember/no-unnecessary-route-path-option': 'error',
    'ghost/ember/route-path-style': 'error',
    'ghost/ember/routes-segments-snake-case': 'error',
    // Services
    'ghost/ember/no-unnecessary-service-injection-argument': 'error',
    // Stylistic
    'ghost/ember/order-in-components': 'error',
    'ghost/ember/order-in-controllers': 'error',
    'ghost/ember/order-in-routes': 'error',
    // Testing
    'ghost/ember/no-ember-testing-in-module-scope': 'error',
    'ghost/ember/no-invalid-test-waiters': 'error',
    'ghost/ember/no-legacy-test-waiters': 'error',
    'ghost/ember/no-noop-setup-on-error-in-before': 'error',
    'ghost/ember/no-pause-test': 'error',
    'ghost/ember/no-replace-test-comments': 'error',
    'ghost/ember/no-restricted-resolver-tests': 'error',
    'ghost/ember/no-settled-after-test-helper': 'error',
    'ghost/ember/no-test-and-then': 'error',
    'ghost/ember/no-test-import-export': 'error',
    'ghost/ember/no-test-module-for': 'error',
    'ghost/ember/no-test-support-import': 'error',
    'ghost/ember/no-test-this-render': 'error',
    'ghost/ember/prefer-ember-test-helpers': 'error',
    'ghost/ember/require-valid-css-selector-in-test-helpers': 'error'
};

const mochaRulesOffForGhost = mochaRulesOff(ghostPlugin);

export default [
    {
        ignores: [
            'dist/**',
            'tmp/**',
            'public/**',
            'config/**',
            'node_modules/**'
        ]
    },
    {
        files: ['**/*'],
        ...strictLinterOptions
    },
    {
        files: ['**/*.js'],
        ...js.configs.recommended,
        languageOptions: {
            parser: babelParser,
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: {
                allowImportExportEverywhere: false,
                ecmaFeatures: {
                    globalReturn: false,
                    legacyDecorators: true,
                    jsx: true
                },
                requireConfigFile: false,
                babelOptions: {
                    plugins: [
                        '@babel/plugin-proposal-class-properties',
                        ['@babel/plugin-proposal-decorators', {legacy: true}],
                        'babel-plugin-transform-react-jsx'
                    ]
                }
            },
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        plugins: {
            ghost: ghostPlugin,
            react: reactPlugin,
            'local-filenames': localFilenamesPlugin
        },
        rules: {
            ...js.configs.recommended.rules,
            ...ghostBaseRules,
            ...emberRules,
            'local-filenames/match-regex': ['error', '^[a-z0-9.-]+$', false],
            // Legacy ghost/admin overrides
            'ghost/ember/no-controller-access-in-routes': 'off',
            'ghost/ember/no-assignment-of-untracked-properties-used-in-tracking-contexts': 'off',
            'ghost/ember/no-actions-hash': 'off',
            'ghost/ember/no-classic-classes': 'off',
            'ghost/ember/no-classic-components': 'off',
            'ghost/ember/require-tagless-components': 'off',
            'ghost/ember/no-component-lifecycle-hooks': 'off',
            'ghost/ember/use-ember-get-and-set': 'off',
            'ghost/ember/no-mixins': 'off',
            'ghost/ember/no-new-mixins': 'off',
            'react/jsx-uses-react': 'error',
            'react/jsx-uses-vars': 'error'
        }
    },
    // Tests: mocha + embertest envs (sinon + should are legacy ghost/test globals)
    {
        files: ['tests/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.mocha,
                ...globals.embertest,
                sinon: 'readonly',
                should: 'readonly'
            }
        },
        rules: {
            ...mochaRulesOffForGhost,
            'ghost/ember/no-invalid-debug-function-arguments': 'off',
            'ghost/mocha/no-setup-in-describe': 'off'
        }
    }
];
