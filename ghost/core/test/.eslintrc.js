module.exports = {
    env: {
        es6: true,
        node: true,
        mocha: true
    },
    globals: {
        // Vitest globals used by files that have migrated off mocha
        // (vitest.config.ts has globals: true). Mocha env covers
        // before/after/etc; these are the vitest-only names.
        beforeAll: 'readonly',
        afterAll: 'readonly'
    },
    plugins: [
        'ghost'
    ],
    extends: [
        'eslint:recommended',
        'plugin:ghost/test'
    ],
    overrides: [
        {
            files: ['**/*.ts'],
            parser: '@typescript-eslint/parser'
        }
    ],
    rules: {
        // TODO: remove this rule once it's turned into "error" in the base plugin
        'no-shadow': 'error',

        // these rules were were not previously enforced in our custom rules,
        // they're turned off here because they _are_ enforced in our plugin.
        // TODO: remove these custom rules and fix the problems in test files where appropriate
        camelcase: 'off',
        'no-prototype-builtins': 'off',
        'no-unused-vars': [
            'error',
            {
                varsIgnorePattern: '^should$',
                argsIgnorePattern: '^_'
            }
        ],
        'no-useless-escape': 'off',

        // Kept: catches committed .skip/.only (applies to Vitest too).
        'ghost/mocha/no-skipped-tests': 'error',
        'ghost/filenames/match-regex': ['error', '^[a-z0-9-.]+$', null, true],

        // Mocha-mechanics checks that misfire on Vitest patterns (setup-file
        // top-level hooks, describe.each, async tests with no done callback).
        // Off post-migration; revisited when we move to oxlint.
        'ghost/mocha/no-setup-in-describe': 'off',
        'ghost/mocha/no-sibling-hooks': 'off',
        'ghost/mocha/no-top-level-hooks': 'off',
        'ghost/mocha/handle-done-callback': 'off'
    }
};
