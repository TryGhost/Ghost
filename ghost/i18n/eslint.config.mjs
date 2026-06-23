import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';

import {
    jsUnusedVarsRule,
    localFilenamesPlugin,
    mochaRulesOff,
    noGhostIgnitionRequireRule,
    nodeLibRules,
    strictLinterOptions
} from '../../eslint.shared.mjs';

// ghost/i18n uses the local-filenames variant of the rule; turn off the
// eslint-plugin-ghost one that nodeLibRules enables via correctnessRules.
const ghostI18nExtras = {
    ...noGhostIgnitionRequireRule,
    'ghost/filenames/match-regex': 'off',
    'local-filenames/match-regex': ['error', '^[a-z0-9.-]+$', false]
};

export default [
    {
        ignores: ['build/**/*']
    },
    {
        files: ['**/*'],
        ...strictLinterOptions
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
            ...nodeLibRules,
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
            ...nodeLibRules,
            ...jsUnusedVarsRule,
            ...ghostI18nExtras,
            ...mochaRulesOff(ghostPlugin),
            'ghost/ghost-custom/node-assert-strict': 'error'
        }
    }
];
