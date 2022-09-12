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
        'tailwindcss/classnames-order': 'error',
        'tailwindcss/enforces-negative-arbitrary-values': 'warn',
        'tailwindcss/enforces-shorthand': 'warn',
        'tailwindcss/migration-from-tailwind-2': 'warn',
        'tailwindcss/no-arbitrary-value': 'off',
        'tailwindcss/no-custom-classname': 'off',
        'tailwindcss/no-contradicting-classname': 'error'
    }
};
