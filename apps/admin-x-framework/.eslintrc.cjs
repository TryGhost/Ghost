module.exports = {
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
        // suppress errors for missing 'import React' in JSX files, as we don't need it
        'react/react-in-jsx-scope': 'off',
        // ignore prop-types for now
        'react/prop-types': 'off',
        'no-restricted-imports': ['error', {
            paths: [{
                name: '@tryghost/shade',
                message: 'Import from layered subpaths instead (components/primitives/patterns/utils/app/tokens).'
            }]
        }],

        'react/jsx-sort-props': ['error', {
            reservedFirst: true,
            callbacksLast: true,
            shorthandLast: true,
            locale: 'en'
        }],
        'react/button-has-type': 'error',
        'react/no-array-index-key': 'error',
        'react/jsx-key': 'off',

        // Enforce kebab-case (lowercase with hyphens) for all filenames
        'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', false]
    }
};
