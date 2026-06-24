import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';

import {
    correctnessRules,
    jsUnusedVarsRule,
    localFilenamesPlugin,
    mochaRulesOff
} from '../../eslint.shared.mjs';

const ghostI18nExtras = {
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
    // This workspace uses the local-filenames variant of the rule; turn off
    // the eslint-plugin-ghost one that correctnessRules enables.
    'ghost/filenames/match-regex': 'off',
    'local-filenames/match-regex': ['error', '^[a-z0-9.-]+$', false]
};

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
            ...correctnessRules,
            ...jsUnusedVarsRule,
            ...ghostI18nExtras
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
            ...correctnessRules,
            ...jsUnusedVarsRule,
            ...ghostI18nExtras,
            ...mochaRulesOff(ghostPlugin),
            'ghost/ghost-custom/node-assert-strict': 'error'
        }
    }
];
