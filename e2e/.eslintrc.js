module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: [
        'ghost',
        'eslint-plugin-playwright'
    ],
    extends: [
        'plugin:ghost/ts'
    ],
    ignorePatterns: ['build/'],
    overrides: [
        {
            files: ['tests/**', 'helpers/playwright/**', 'helpers/pages/**'],
            extends: [
                'plugin:playwright/recommended'
            ]
        }
    ]
};
