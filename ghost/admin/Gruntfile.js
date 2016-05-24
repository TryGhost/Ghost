/* global module, require, process */
/* jscs:disable */
var path = require('path'),

    escapeChar = process.platform.match(/^win/) ? '^' : '\\',
    cwd        = process.cwd().replace(/( |\(|\))/g, escapeChar + '$1');

module.exports = function(grunt) {

    // Find all of the task which start with `grunt-` and load them, rather than explicitly declaring them all
    require('matchdep').filterDev(['grunt-*', '!grunt-cli']).forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        jshint: {
            options: {
                jshintrc: true,
                ignores: [
                    'node_modules/**',
                    'bower_components/**',
                    'tmp/**',
                    'dist/**',
                    'vendor/**'
                ]
            },

            all: ['**/*.js']
        },

        jscs: {
            app: {
                options: {
                    config: '.jscsrc',
                    excludeFiles: [
                        'node_modules/**',
                        'bower_components/**',
                        'tests/**',
                        'tmp/**',
                        'dist/**',
                        'vendor/**'
                    ]
                },

                files: {
                    src: ['**/*.js']
                }
            },

            tests: {
                options: {
                    config: 'tests/.jscsrc'
                },

                files: {
                    src: [
                        'tests/**/*.js'
                    ]
                }
            }
        },

        shell: {
            csscombfix: {
                command: path.resolve(cwd + '/node_modules/.bin/csscomb -c app/styles/csscomb.json -v app/styles')
            },

            csscomblint: {
                command: path.resolve(cwd + '/node_modules/.bin/csscomb -c app/styles/csscomb.json -lv app/styles')
            }
        }
    });

    grunt.registerTask('lint', 'Run the code style checks and linter',
        ['jshint', 'jscs', 'shell:csscomblint']
    );
};
