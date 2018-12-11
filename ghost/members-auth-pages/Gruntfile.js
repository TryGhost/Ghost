/* eslint-env node */
/* eslint-disable object-shorthand */
'use strict';

module.exports = function (grunt) {
    // Find all of the task which start with `grunt-` and load them, rather than explicitly declaring them all
    require('matchdep').filterDev(['grunt-*', '!grunt-cli']).forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        clean: {
            built: {
                src: ['dist/**']
            },
            dependencies: {
                src: ['node_modules/**']
            },
            tmp: {
                src: ['tmp/**']
            }
        },

        shell: {
            'npm-install': {
                command: 'yarn install'
            },

            preact: {
                command: function (mode) {
                    switch (mode) {
                    case 'prod':
                        return 'yarn build';
                    case 'dev':
                        return 'yarn dev';
                    }
                }
            },

            options: {
                preferLocal: true
            }
        }
    });

    grunt.registerTask('init', 'Install the preact member dependencies',
        ['shell:npm-install', 'shell:preact:prod']
    );
};
