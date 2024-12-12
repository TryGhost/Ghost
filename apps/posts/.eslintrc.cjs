/* eslint-env node */
module.exports = {
    root: true,
    extends: [
        'plugin:ghost/ts',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
    ],
    plugins: [
        'ghost',
        'react-refresh',
        'tailwindcss'
    ],
    settings: {
        react: {
            version: 'detect'
        }
    },
    rules: {
        // sort multiple import lines into alphabetical groups
        'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
            memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
        }],

        // TODO: re-enable this (maybe fixed fast refresh?)
        'react-refresh/only-export-components': 'off',

        // suppress errors for missing 'import React' in JSX files, as we don't need it
        'react/react-in-jsx-scope': 'off',
        // ignore prop-types for now
        'react/prop-types': 'off',

        // TODO: re-enable these if deemed useful
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-function': 'off',

        // custom react rules
        'react/jsx-sort-props': ['error', {
            reservedFirst: true,
            callbacksLast: true,
            shorthandLast: true,
            locale: 'en'
        }],
        'react/button-has-type': 'error',
        'react/no-array-index-key': 'error',
        'react/jsx-key': 'off',

        'tailwindcss/classnames-order': ['error', {config: 'tailwind.config.cjs'}],
        'tailwindcss/enforces-negative-arbitrary-values': ['warn', {config: 'tailwind.config.cjs'}],
        'tailwindcss/enforces-shorthand': ['warn', {config: 'tailwind.config.cjs'}],
        'tailwindcss/migration-from-tailwind-2': ['warn', {config: 'tailwind.config.cjs'}],
        'tailwindcss/no-arbitrary-value': 'off',
        'tailwindcss/no-custom-classname': 'off',
        'tailwindcss/no-contradicting-classname': ['error', {config: 'tailwind.config.cjs'}]
    }
};
