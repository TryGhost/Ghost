const config = require('./core/shared/config');
const fs = require('fs-extra');
const path = require('path');

// Utility for outputting messages indicating that the admin is building, as it can take a while.
let hasBuiltClient = false;
const logBuildingClient = function (grunt) {
    if (!hasBuiltClient) {
        grunt.log.writeln('Building admin client... (can take ~1min)');
        setTimeout(logBuildingClient, 5000, grunt);
    }
};

module.exports = function (grunt) {
    // grunt dev - use yarn dev instead!
    // - Start a server & build assets on the fly whilst developing
    grunt.registerTask('dev', 'Dev Mode; watch files and restart server on changes', function () {
        if (grunt.option('client')) {
            grunt.task.run(['clean:built', 'bgShell:client']);
        } else if (grunt.option('server')) {
            grunt.task.run(['express:dev', 'watch']);
        } else {
            grunt.task.run(['clean:built', 'bgShell:client', 'express:dev', 'watch']);
        }
    });

    // grunt build -- use yarn build instead!
    // - Builds the client without a watch task
    grunt.registerTask('build', 'Build client app in development mode',
        ['subgrunt:init', 'clean:tmp', 'ember']);

    // Helpers for common deprecated tasks
    grunt.registerTask('main', function () {
        grunt.log.error('@deprecated: Run `yarn main` instead');
    });

    grunt.registerTask('validate', function () {
        grunt.log.error('@deprecated: Run `yarn test` instead');
    });

    // --- Sub Commands
    // Used to make other commands work

    // Updates submodules, then installs and builds the client for you
    grunt.registerTask('init', 'Prepare the project for development',
        ['update_submodules:pinned', 'build']);

    // Runs ember dev
    grunt.registerTask('ember', 'Build JS & templates for development',
        ['subgrunt:dev']);

    // Production asset build
    grunt.registerTask('prod', 'Build JS & templates for production',
        ['subgrunt:prod', 'postcss:prod']);

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
        // Tools for building the client
        bgShell: {
            client: {
                cmd: function () {
                    logBuildingClient(grunt);
                    return 'grunt subgrunt:watch';
                },
                bg: grunt.option('client') ? false : true,
                stdout: function (chunk) {
                    // hide certain output to prevent confusion when running alongside server
                    const filter = grunt.option('client') ? false : [
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
                        hasBuiltClient = true;
                    }
                },
                stderr: function (chunk) {
                    const skipFilter = grunt.option('client') ? false : [
                        /- building/
                    ].some(function (regexp) {
                        return regexp.test(chunk);
                    });

                    const errorFilter = grunt.option('client') ? false : [
                        /^>>/
                    ].some(function (regexp) {
                        return regexp.test(chunk);
                    });

                    if (!skipFilter) {
                        hasBuiltClient = errorFilter ? hasBuiltClient : true;
                        grunt.log.error(chunk);
                    }
                }
            }
        },

        // grunt-shell
        // Command line tools where it's easier to run a command directly than configure a grunt plugin
        shell: {
            main: {
                command: function () {
                    const upstream = grunt.option('upstream') || process.env.GHOST_UPSTREAM || 'upstream';
                    grunt.log.writeln('Pulling down the latest main from ' + upstream);
                    return `
                        git submodule sync && \
                        git submodule update

                        if ! git diff --exit-code --quiet --ignore-submodules=untracked; then
                            echo "Working directory is not clean, do you have uncommitted changes? Please commit, stash or discard changes to continue."
                            exit 1
                        fi

                        git checkout main

                        if git config remote.${upstream}.url > /dev/null; then
                            git pull ${upstream} main
                        else
                            git pull origin main
                        fi

                        yarn && \
                        git submodule foreach "
                            git checkout main

                            if git config remote.${upstream}.url > /dev/null; then
                                git pull ${upstream} main
                            else
                                git pull origin main
                            fi
                        "
                    `;
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

        // @lodder/grunt-postcss
        // Generate processed, minified css files
        postcss: {
            prod: {
                options: {
                    processors: [
                        require('cssnano')() // minify the result
                    ]
                },
                files: {
                    'core/server/public/ghost.min.css': 'core/server/public/ghost.css'
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
                    'core/client': 'init'
                }
            },

            dev: {
                'core/client': 'shell:ember:dev'
            },

            prod: {
                'core/client': 'shell:ember:prod'
            },

            watch: {
                projects: {
                    'core/client': ['shell:ember:watch', '--live-reload-base-url="' + config.getSubdir() + '/ghost/"']
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
    grunt.loadNpmTasks('@lodder/grunt-postcss');
    grunt.loadNpmTasks('grunt-bg-shell');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-symlink');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-express-server');
    grunt.loadNpmTasks('grunt-shell');
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

    // --- Release Tooling

    // grunt release
    // - create a Ghost release zip file.
    // Uses the files specified by `.npmignore` to know what should and should not be included.
    // Runs the asset generation tasks for production and duplicates default-prod.html to default.html
    grunt.registerTask('release',
        'Release task - creates a final built zip\n' +
        ' - Do our standard build steps \n' +
        ' - Copy files to release-folder/#/#{version} directory\n' +
        ' - Clean out unnecessary files (.git*, etc)\n' +
        ' - Zip files in release-folder to dist-folder/#{version} directory',
        function () {
            const escapeChar = process.platform.match(/^win/) ? '^' : '\\';
            const cwd = process.cwd().replace(/( |\(|\))/g, escapeChar + '$1');
            const buildDirectory = path.resolve(cwd, '.build');
            const distDirectory = path.resolve(cwd, '.dist');

            // Common paths used by release
            grunt.config.set('paths', {
                build: buildDirectory,
                releaseBuild: path.join(buildDirectory, 'release'),
                dist: distDirectory,
                releaseDist: path.join(distDirectory, 'release')
            });

            // Load package.json so that we can create correctly versioned releases.
            grunt.config.set('pkg', grunt.file.readJSON('package.json'));

            // grunt-contrib-copy
            grunt.config.set('copy.release', {
                expand: true,
                // A list of files and patterns to include when creating a release zip.
                // This is read from the `.npmignore` file and all patterns are inverted as we want to define what to include
                src: fs.readFileSync('.npmignore', 'utf8').split('\n').filter(Boolean).map(function (pattern) {
                    return pattern[0] === '!' ? pattern.substr(1) : '!' + pattern;
                }),
                dest: '<%= paths.releaseBuild %>/'
            });

            grunt.config.set('copy.admin_html', {
                files: [{
                    cwd: '.',
                    src: 'core/server/web/admin/views/default-prod.html',
                    dest: 'core/server/web/admin/views/default.html'
                }]
            });

            // grunt-contrib-compress
            grunt.config.set('compress.release', {
                options: {
                    archive: '<%= paths.releaseDist %>/Ghost-<%= pkg.version %>.zip'
                },
                expand: true,
                cwd: '<%= paths.releaseBuild %>/',
                src: ['**']
            });

            // grunt-contrib-clean
            grunt.config.set('clean.release', {
                src: ['<%= paths.releaseBuild %>/**']
            });

            if (!grunt.option('skip-update')) {
                grunt.task
                    .run('update_submodules:pinned')
                    .run('subgrunt:init');
            }

            grunt.task
                .run('clean:built')
                .run('clean:tmp')
                .run('prod')
                .run('clean:release')
                .run('copy:admin_html')
                .run('copy:release')
                .run('compress:release');
        }
    );
};
