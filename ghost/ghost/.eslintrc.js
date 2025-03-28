module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/ts'
    ],
    rules: {
        // disable file naming rule in favor or dotted notation e.g. `snippets.service.ts`
        'ghost/filenames/match-exported-class': [0, null, true],
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_'
            }
        ]
    }
};
