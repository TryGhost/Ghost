// ### Config for grunt-groc
// Generate documentation from code

module.exports = {

    docs: {
        options: {
            'out': './docs/',
            'glob': [
                'README.md',
                'config.example.js',
                'index.js',
                'core/*.js',
                'core/server/**/*.js',
                'core/shared/**/*.js',
                'core/client/**/*.js'
            ],
            'except': [
                '!core/**/vendor/**/*.js',
                '!core/client/tpl/**/*.js'
            ]
        }
    }

};