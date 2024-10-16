const path = require('path');

module.exports = {
    env: {
        es6: true,
        node: true
    },
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/node'
    ],
    rules: {
        // @TODO: remove this rule once it's turned into "error" in the base plugin
        'no-shadow': 'error',
        'no-var': 'error',
        'one-var': ['error', 'never']
    },
    overrides: [
        {
            files: 'core/server/api/endpoints/*',
            rules: {
                'ghost/ghost-custom/max-api-complexity': 'error'
            }
        },
        {
            files: 'core/server/data/migrations/versions/**',
            excludedFiles: [
                'core/server/data/migrations/versions/1.*/*',
                'core/server/data/migrations/versions/2.*/*',
                'core/server/data/migrations/versions/3.*/*'
            ],
            rules: {
                'ghost/filenames/match-regex': ['error', '^(?:\\d{4}(?:-\\d{2}){4,5}|\\d{2})(?:-[a-zA-Z]+){2,}$', true]
            }
        },
        {
            files: 'core/server/data/migrations/versions/**',
            rules: {
                'no-restricted-syntax': ['error', {
                    selector: 'ForStatement',
                    message: 'For statements can perform badly in migrations'
                }, {
                    selector: 'ForOfStatement',
                    message: 'For statements can perform badly in migrations'
                }, {
                    selector: 'ForInStatement',
                    message: 'For statements can perform badly in migrations'
                }, {
                    selector: 'WhileStatement',
                    message: 'While statements can perform badly in migrations'
                }, {
                    selector: 'CallExpression[callee.property.name=\'forEach\']',
                    message: 'Loop constructs like forEach can perform badly in migrations'
                }, {
                    selector: 'CallExpression[callee.object.name=\'_\'][callee.property.name=\'each\']',
                    message: 'Loop constructs like _.each can perform badly in migrations'
                }, {
                    selector: 'CallExpression[callee.property.name=/join|innerJoin|leftJoin/] CallExpression[callee.property.name=/join|innerJoin|leftJoin/] CallExpression[callee.name=\'knex\']',
                    message: 'Use of multiple join statements in a single knex block'
                }],
                'ghost/no-return-in-loop/no-return-in-loop': ['error']
            }
        },
        {
            files: 'core/shared/**',
            rules: {
                'ghost/node/no-restricted-require': ['error', [
                    {
                        name: path.resolve(__dirname, 'core/server/**'),
                        message: 'Invalid require of core/server from core/shared.'
                    },
                    {
                        name: path.resolve(__dirname, 'core/frontend/**'),
                        message: 'Invalid require of core/frontend from core/shared.'
                    }
                ]]
            }
        },
        {
            files: ['core/frontend/helpers/**', 'core/frontend/apps/*/lib/helpers/**'],
            rules: {
                'ghost/filenames/match-regex': ['off', '^[a-z0-9-.]$', null, true]
            }
        },
        /**
         * @TODO: enable these soon
         */
        {
            files: 'core/frontend/**',
            rules: {
                'ghost/node/no-restricted-require': ['off', [
                    // If we make the frontend entirely independent, these have to be solved too
                    // {
                    //     name: path.resolve(__dirname, 'core/shared/**'),
                    //     message: 'Invalid require of core/shared from core/frontend.'
                    // },
                    // These are critical refactoring issues that we need to tackle ASAP
                    {
                        name: [path.resolve(__dirname, 'core/server/**')],
                        message: 'Invalid require of core/server from core/frontend.'
                    }
                ]]
            }
        },
        {
            files: 'core/server/**',
            rules: {
                'ghost/node/no-restricted-require': ['warn', [
                    {
                        // Throw an error for all requires of the frontend, _except_ the url service which will be moved soon
                        name: [path.resolve(__dirname, 'core/frontend/**')],
                        message: 'Invalid require of core/frontend from core/server.'
                    }
                ]]
            }
        }
    ]
};
