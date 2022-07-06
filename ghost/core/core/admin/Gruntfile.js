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

        watch: {
            csscomb: {
                files: ['app/styles/**/*.css'],
                tasks: ['shell:csscombfix']
            }
        },

        shell: {
            'npm-install': {
                command: 'yarn install'
            },

            ember: {
                command: function (mode) {
                    let liveReloadBaseUrl = grunt.option('live-reload-base-url') || '/ghost/';

                    switch (mode) {
                    case 'prod':
                        return 'npm run build -- --environment=production --silent';
                    case 'dev':
                        return 'npm run build';
                    case 'watch':
                        return `npm run start -- --live-reload-base-url=${liveReloadBaseUrl} --live-reload-port=4201`;
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

    grunt.registerTask('init', 'Install the admin dependencies',
        ['shell:npm-install']
    );
};
