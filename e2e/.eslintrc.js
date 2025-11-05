module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: [
        'ghost',
        'playwright'
    ],
    extends: [
        'plugin:ghost/ts'
    ],
    ignorePatterns: ['build/'],
    rules: {
        // sort multiple import lines into alphabetical groups
        'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
            memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
        }]
    },
    overrides: [
        {
            files: ['tests/**', 'helpers/playwright/**', 'helpers/pages/**'],
            extends: ['plugin:playwright/recommended']
        }
    ]
};
