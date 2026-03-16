/* eslint-env node */
const tailwindCssConfig = `${__dirname}/tailwind.config.cjs`;

module.exports = {
    root: true,
    extends: [
        'plugin:ghost/ts',
        'plugin:react/recommended'
    ],
    plugins: [
        'ghost',
        'tailwindcss'
    ],
    settings: {
        react: {
            version: 'detect'
        },
        tailwindcss: {
            config: tailwindCssConfig
        }
    },
    rules: {
        // Sort multiple import lines into alphabetical groups
        'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
            memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
        }],

        // Enforce kebab-case (lowercase with hyphens) for all filenames
        'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', false],

        // Suppress errors for missing 'import React' in JSX files, as we don't need it
        'react/react-in-jsx-scope': 'off',
        // Ignore prop-types for now
        'react/prop-types': 'off',

        // Custom react rules
        'react/jsx-sort-props': ['error', {
            reservedFirst: true,
            callbacksLast: true,
            shorthandLast: true,
            locale: 'en'
        }],
        'react/button-has-type': 'error',
        'react/no-array-index-key': 'error',

        'tailwindcss/classnames-order': 'error',
        'tailwindcss/enforces-negative-arbitrary-values': 'warn',
        'tailwindcss/enforces-shorthand': 'warn',
        'tailwindcss/migration-from-tailwind-2': 'warn',
        'tailwindcss/no-arbitrary-value': 'off',
        'tailwindcss/no-custom-classname': 'off',
        'tailwindcss/no-contradicting-classname': 'error'
    }
};
