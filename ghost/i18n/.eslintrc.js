const fs = require('fs');
const path = require('path');

const todoConfigPath = path.join(__dirname, '.eslintrc-todo.json');
const todoConfig = fs.existsSync(todoConfigPath) ? require(todoConfigPath) : { overrides: [] };

module.exports = {
    root: true,
    plugins: [
        'ghost',
        'ghost-i18n'
    ],
    extends: [
        'plugin:ghost/node'
    ],
    rules: {
        'ghost-i18n/matching-variables': 'error'
    },
    overrides: [
        {
            files: ['*.json'],
            parser: 'jsonc-eslint-parser',
            rules: {
                'ghost-i18n/matching-variables': 'error'
            }
        },
        {
            files: ['context.json'],
            rules: {
                'ghost-i18n/matching-variables': 'off'
            }
        },
        ...todoConfig.overrides
    ]
};
