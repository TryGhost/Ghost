const config = require('./core/shared/config');

// Utility for outputting messages indicating that the admin is building, as it can take a while.
let hasBuiltAdmin = false;
const logBuildingAdmin = function (grunt) {
    if (!hasBuiltAdmin) {
        grunt.log.writeln('Building admin app... (can take ~1min)');
        setTimeout(logBuildingAdmin, 5000, grunt);
    }
};

module.exports = function (grunt) {
    // grunt dev - use yarn dev instead!
    // - Start a server & build assets on the fly whilst developing
    grunt.registerTask('dev', 'Dev Mode; watch files and restart server on changes', function () {
        if (grunt.option('admin')) {
            grunt.task.run(['clean:built', 'bgShell:admin']);
        } else if (grunt.option('server')) {
            grunt.task.run(['express:dev', 'watch']);
        } else {
            grunt.task.run(['clean:built', 'bgShell:admin', 'express:dev', 'watch']);
        }
    });

    // grunt build -- use yarn build instead!
    // - Builds the admin without a watch task
    grunt.registerTask('build', 'Build admin app in development mode',
        ['subgrunt:init', 'clean:tmp', 'ember']);

    // Runs the asset generation tasks for production and duplicates default-prod.html to default.html
    grunt.registerTask('release', 'Release task - creates a final built zip', ['clean:built', 'prod']);

    // --- Sub Commands
    // Used to make other commands work

    // Updates submodules, then installs and builds the admin for you
    grunt.registerTask('init', 'Prepare the project for development',
        ['update_submodules:pinned', 'build']);

    // Runs ember dev
    grunt.registerTask('ember', 'Build JS & templates for development',
        ['subgrunt:dev']);

    // Production asset build
    grunt.registerTask('prod', 'Build JS & templates for production', 'subgrunt:prod');

    // --- Configuration
    const cfg = {
        // grunt-contrib-watch
        // Watch files and livereload in the browser during development.
        // See the grunt dev task for how this is used.
        watch: grunt.option('no-server-watch') ? {files: []} : {
            livereload: {
                files: [
                    'content/themes/casper/assets/css/*.css',
                    'content/themes/casper/assets/js/*.js'
                ],
                options: {
                    livereload: true,
                    interval: 500
                }
            },
            express: {
                files: [
                    'core/server/**/*.js',
                    'core/shared/**/*.js',
                    'core/frontend/**/*.js',
                    'core/frontend/src/**/*.css',
                    'core/*.js',
                    'index.js',
                    'config.*.json',
                    '!config.testing.json'
                ],
                tasks: ['express:dev'],
                options: {
                    spawn: false,
                    livereload: true,
                    interval: 500
                }
            }
        },

        // grunt-express-server
        // Start a Ghost express server for use in development and testing
        express: {
            dev: {
                options: {
                    script: 'index.js',
                    output: 'Ghost is running'
                }
            }
        },

        // grunt-bg-shell
        // Tools for building the admin
        bgShell: {
            admin: {
                cmd: function () {
                    logBuildingAdmin(grunt);
                    return 'grunt subgrunt:watch';
                },
                bg: grunt.option('admin') ? false : true,
                stdout: function (chunk) {
                    // hide certain output to prevent confusion when running alongside server
                    const filter = grunt.option('admin') ? false : [
                        /> ghost-admin/,
                        /^Livereload/,
                        /^Serving on/
                    ].some(function (regexp) {
                        return regexp.test(chunk);
                    });

                    if (!filter) {
                        grunt.log.write(chunk);
                    }

                    if (chunk.indexOf('Slowest Nodes') !== -1) {
                        hasBuiltAdmin = true;
                    }
                },
                stderr: function (chunk) {
                    const skipFilter = grunt.option('admin') ? false : [
                        /- building/
                    ].some(function (regexp) {
                        return regexp.test(chunk);
                    });

                    const errorFilter = grunt.option('admin') ? false : [
                        /^>>/
                    ].some(function (regexp) {
                        return regexp.test(chunk);
                    });

                    if (!skipFilter) {
                        hasBuiltAdmin = errorFilter ? hasBuiltAdmin : true;
                        grunt.log.error(chunk);
                    }
                }
            }
        },

        // grunt-contrib-clean
        // Clean up files as part of other tasks
        clean: {
            built: {
                src: [
                    'core/built/**'
                ]
            },
            tmp: {
                src: ['.tmp/**']
            }
        },

        // grunt-update-submodules
        // Grunt task to update git submodules
        update_submodules: {
            pinned: {
                options: {
                    params: '--init'
                }
            }
        },

        // grunt-subgrunt
        // Run grunt tasks in submodule Gruntfiles
        subgrunt: {
            options: {
                npmInstall: false,
                npmPath: 'yarn'
            },

            init: {
                options: {
                    npmInstall: true
                },
                projects: {
                    'core/admin': 'init'
                }
            },

            dev: {
                'core/admin': 'shell:ember:dev'
            },

            prod: {
                'core/admin': 'shell:ember:prod'
            },

            watch: {
                projects: {
                    'core/admin': ['shell:ember:watch', '--live-reload-base-url="' + config.getSubdir() + '/ghost/"']
                }
            }
        },

        // grunt-contrib-symlink
        // Create symlink for git hooks
        symlink: {
            githooks: {
                // Enable overwrite to delete symlinks before recreating them
                overwrite: false,
                // Enable force to overwrite symlinks outside the current working directory
                force: false,
                // Expand to all files in /hooks
                expand: true,
                cwd: '.github/hooks',
                src: ['*'],
                dest: '.git/hooks'
            }
        }
    };

    // --- Grunt Initialisation

    // Load all grunt tasks
    grunt.loadNpmTasks('grunt-bg-shell');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-symlink');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-express-server');
    grunt.loadNpmTasks('grunt-subgrunt');
    grunt.loadNpmTasks('grunt-update-submodules');

    // This little bit of weirdness gives the express server chance to shutdown properly
    const waitBeforeExit = () => {
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    };

    process.on('SIGINT', waitBeforeExit);
    process.on('SIGTERM', waitBeforeExit);

    // Load the configuration
    grunt.initConfig(cfg);
};
