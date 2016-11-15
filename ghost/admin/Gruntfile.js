/* eslint-env node */
/* eslint-disable no-var, one-var, object-shorthand, prefer-template */
var _              = require('lodash'),
    fs             = require('fs-extra'),
    path           = require('path'),
    https          = require('https'),
    moment         = require('moment'),
    chalk          = require('chalk'),
    Promise        = require('bluebird');

module.exports = function(grunt) {

    // Find all of the task which start with `grunt-` and load them, rather than explicitly declaring them all
    require('matchdep').filterDev(['grunt-*', '!grunt-cli']).forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        clean: {
            built: {
                src: [
                    'dist/**'
                ]
            },
            dependencies: {
                src: [
                    'bower_components/**',
                    'node_modules/**'
                ]
            },
            tmp: {
                src: ['tmp/**']
            }
        },

        // ### grunt-bg-shell
        // Used to run ember-cli watch in the background
        bgShell: {
            ember: {
                cmd: 'npm run build -- --watch',
                bg: true
            }
        },

        watch: {
            csscomb: {
                files: ['app/styles/**/*.css'],
                tasks: ['shell:csscombfix']
            }
        },

        shell: {
            'npm-install': {
                command: 'npm install'
            },

            'bower-install': {
                command: 'bower install'
            },

            ember: {
                command: function (mode) {
                    switch (mode) {
                    case 'prod':
                        return 'npm run build -- --environment=production --silent';
                    case 'dev':
                        return 'npm run build';
                    }
                },
                options: {
                    execOptions: {
                        stdout: false
                    }
                }
            },

            csscombfix: {
                command: 'csscomb -c app/styles/csscomb.json -v app/styles'
            },

            csscomblint: {
                command: 'csscomb -c app/styles/csscomb.json -lv app/styles'
            },

            test: {
                command: 'npm test'
            },

            options: {
                preferLocal: true
            }
        }
    });

    grunt.registerTask('init', 'Install the client dependencies',
        ['shell:npm-install', 'shell:bower-install']
    );
};
