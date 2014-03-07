// ### Config for grunt-jslint
// JSLint all the things!

module.exports = {

    server: {
        directives: {
            // node environment
            node: true,
            // browser environment
            browser: false,
            // allow dangling underscores in var names
            nomen: true,
            // allow to do statements
            todo: true,
            // don't require use strict pragma
            sloppy: true
        },
        files: {
            src: [
              '*.js',
              'core/*.js',
              'core/server/**/*.js'
            ]
        }
    },
    client: {
        directives: {
            // node environment
            node: false,
            // browser environment
            browser: true,
            // allow dangling underscores in var names
            nomen: true,
            // allow to do statements
            todo: true
        },
        files: {
            src: 'core/client/**/*.js'
        },
        exclude: [
            'core/client/assets/vendor/**/*.js',
            'core/client/tpl/**/*.js'
        ]
    },
    shared: {
        directives: {
            // node environment
            node: true,
            // browser environment
            browser: false,
            // allow dangling underscores in var names
            nomen: true,
            // allow to do statements
            todo: true,
            // allow unused parameters
            unparam: true,
            // don't require use strict pragma
            sloppy: true
        },
        files: {
            src: [
                'core/shared/**/*.js'
            ]
        },
        exclude: [
            'core/shared/vendor/**/*.js'
        ]
    }

};