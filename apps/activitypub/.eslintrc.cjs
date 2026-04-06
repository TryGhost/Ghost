/* eslint-env node */
const tailwindCssConfig = `${__dirname}/../admin/src/index.css`;

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
        },
        tailwindcss: {
            config: tailwindCssConfig
        }
    },
    rules: {
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': 'error',

        // Enforce kebab-case (lowercase with hyphens) for all filenames
        'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', false],

        // sort multiple import lines into alphabetical groups
        'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
            memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
        }],
        'no-restricted-imports': ['error', {
            paths: [{
                name: '@tryghost/shade',
                message: 'Import from layered subpaths instead (components/primitives/patterns/utils/app/tokens).'
            }]
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

        'tailwindcss/classnames-order': 'error',
        'tailwindcss/enforces-negative-arbitrary-values': 'warn',
        'tailwindcss/enforces-shorthand': 'warn',
        'tailwindcss/migration-from-tailwind-2': 'warn',
        'tailwindcss/no-arbitrary-value': 'off',
        'tailwindcss/no-custom-classname': 'off',
        'tailwindcss/no-contradicting-classname': 'error'
    }
};
