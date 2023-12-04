/* eslint-env node */
module.exports = {
    root: true,
    extends: [
        'plugin:ghost/ts',
        'plugin:react/recommended',
        'plugin:i18next/recommended'
    ],
    plugins: [
        'ghost',
        'tailwindcss',
        'i18next'
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

        // TODO: fix + remove this
        '@typescript-eslint/no-explicit-any': 'warn',

        // suppress errors for missing 'import React' in JSX files, as we don't need it
        'react/react-in-jsx-scope': 'off',
        // ignore prop-types for now
        'react/prop-types': 'off',

        // custom react rules
        'react/jsx-sort-props': ['error', {
            reservedFirst: true,
            callbacksLast: true,
            shorthandLast: true,
            locale: 'en'
        }],
        'react/button-has-type': 'error',
        'react/no-array-index-key': 'error',

        'tailwindcss/classnames-order': ['error', {config: 'tailwind.config.cjs'}],
        'tailwindcss/enforces-negative-arbitrary-values': ['warn', {config: 'tailwind.config.cjs'}],
        'tailwindcss/enforces-shorthand': ['warn', {config: 'tailwind.config.cjs'}],
        'tailwindcss/migration-from-tailwind-2': ['warn', {config: 'tailwind.config.cjs'}],
        'tailwindcss/no-arbitrary-value': 'off',
        'tailwindcss/no-custom-classname': 'off',
        'tailwindcss/no-contradicting-classname': ['error', {config: 'tailwind.config.cjs'}],

        // This rule doesn't work correctly with TypeScript, and TypeScript has its own better version
        'no-undef': 'off'
    }
};
