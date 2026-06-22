import path from 'node:path';
import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';

// eslint-plugin-filenames-ts@1.3.2's match-regex rule still calls
// context.getScope(), which ESLint 9 removed. Replace it with a minimal
// equivalent that only does the filename check (no isExporting / isExportingClass).
const filenamesMatchRegex = {
    meta: {
        type: 'problem',
        schema: [{type: 'string'}, {type: ['boolean', 'null']}, {type: ['boolean', 'null']}]
    },
    create(context) {
        const pattern = new RegExp(context.options[0]);
        return {
            Program(node) {
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

const localFilenamesPlugin = {
    rules: {'match-regex': filenamesMatchRegex}
};

const ghostRules = {
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
    'no-unused-vars': ['error', {caughtErrors: 'none'}],
    'no-var': 'warn',
    'one-var': ['warn', 'never'],
    'ghost/node/no-restricted-require': ['warn', [
        {
            name: 'ghost-ignition',
            message: '@deprecated, please use @tryghost/errors, @tryghost/logging or @tryghost/debug. Config and Server are coming soon!'
        }
    ]],
    'ghost/ghost-custom/no-native-error': 'error',
    'ghost/ghost-custom/ghost-error-usage': 'error',
    'ghost/ghost-custom/ghost-tpl-usage': 'error',
    'local-filenames/match-regex': ['error', '^[a-z0-9.-]+$', false]
};

const mochaRulesOff = Object.fromEntries(
    Object.keys(ghostPlugin.rules || {})
        .filter(rule => rule.startsWith('mocha/'))
        .map(rule => [`ghost/${rule}`, 'off'])
);

export default [
    {
        ignores: ['build/**/*']
    },
    {
        files: ['*.js', 'lib/**/*.js'],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: globals.node
        },
        plugins: {
            ghost: ghostPlugin,
            'local-filenames': localFilenamesPlugin
        },
        rules: {
            ...js.configs.recommended.rules,
            ...ghostRules
        }
    },
    {
        files: ['lib/**/index.js', 'index.js'],
        rules: {
            'max-lines': ['error', {skipBlankLines: true, skipComments: true, max: 50}]
        }
    },
    {
        files: ['test/**/*.js'],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
                ...globals.mocha,
                ...globals.vitest,
                vi: 'readonly',
                beforeAll: 'readonly',
                should: 'readonly',
                sinon: 'readonly'
            }
        },
        plugins: {
            ghost: ghostPlugin,
            'local-filenames': localFilenamesPlugin
        },
        rules: {
            ...js.configs.recommended.rules,
            ...ghostRules,
            ...mochaRulesOff,
            'ghost/ghost-custom/node-assert-strict': 'error'
        }
    }
];
