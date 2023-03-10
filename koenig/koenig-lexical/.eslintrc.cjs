/* eslint-env node */
module.exports = {
    root: true,
    extends: [
        'react-app',
        'plugin:ghost/browser'
    ],
    plugins: [
        'ghost',
        'tailwindcss'
    ],
    rules: {
        // sort multiple import lines into alphabetical groups
        'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
            memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
        }],

        'tailwindcss/classnames-order': ['error', {config: 'tailwind.config.cjs'}],
        'tailwindcss/enforces-negative-arbitrary-values': ['warn', {config: 'tailwind.config.cjs'}],
        'tailwindcss/enforces-shorthand': ['warn', {config: 'tailwind.config.cjs'}],
        'tailwindcss/migration-from-tailwind-2': ['warn', {config: 'tailwind.config.cjs'}],
        'tailwindcss/no-arbitrary-value': 'off',
        'tailwindcss/no-custom-classname': 'off',
        'tailwindcss/no-contradicting-classname': ['error', {config: 'tailwind.config.cjs'}]
    }
};
