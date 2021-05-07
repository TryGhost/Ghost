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
        'one-var': [2, 'never']
    },
    overrides: [
        {
            files: 'core/shared/**',
            rules: {
                'ghost/node/no-restricted-require': ['warn', [
                    {
                        name: '../server/**',
                        message: 'Invalid require of core/server from core/shared.'
                    },
                    {
                        name: '../frontend/**',
                        message: 'Invalid require of core/frontend from core/shared.'
                    }
                ]]
            }
        }
    ]
};
