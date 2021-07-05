const config = require('./core/shared/config');
const fs = require('fs-extra');
const path = require('path');
const escapeChar = process.platform.match(/^win/) ? '^' : '\\';
const cwd = process.cwd().replace(/( |\(|\))/g, escapeChar + '$1');
const buildDirectory = path.resolve(cwd, '.build');
const distDirectory = path.resolve(cwd, '.dist');

let hasBuiltClient = false;
const logBuildingClient = function (grunt) {
    if (!hasBuiltClient) {
        grunt.log.writeln('Building admin client... (can take ~1min)');
        setTimeout(logBuildingClient, 5000, grunt);
    }
};

// ## Grunt configuration
const configureGrunt = function (grunt) {
    // #### Load all grunt tasks
    grunt.loadNpmTasks('@lodder/grunt-postcss');
    grunt.loadNpmTasks('grunt-bg-shell');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-symlink');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-express-server');
    grunt.loadNpmTasks('grunt-mocha-cli');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-subgrunt');
    grunt.loadNpmTasks('grunt-update-submodules');

    /** This little bit of weirdness gives the express server chance to shutdown properly */
    const waitBeforeExit = () => {
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    };

    process.on('SIGINT', waitBeforeExit);
    process.on('SIGTERM', waitBeforeExit);

    const cfg = {
        // #### Common paths used by tasks
        paths: {
            build: buildDirectory,
            releaseBuild: path.join(buildDirectory, 'release'),
            dist: distDirectory,
            releaseDist: path.join(distDirectory, 'release')
        },
        // Standard build type, for when we have nightlies again.
        buildType: 'Build',
        // Load package.json so that we can create correctly versioned releases.
        pkg: grunt.file.readJSON('package.json'),

        clientFiles: [
            'server/web/admin/views/default.html',
            'built/assets/ghost.js',
            'built/assets/ghost.css',
            'built/assets/vendor.js',
            'built/assets/vendor.css'
        ],

        // ### grunt-contrib-watch
        // Watch files and livereload in the browser during development.
        // See the [grunt dev](#live%20reload) task for how this is used.
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

        // ### grunt-express-server
        // Start a Ghost express server for use in development and testing
        express: {
            options: {
                script: 'index.js',
                output: 'Ghost is running'
            },

            dev: {
                options: {}
            }
        },

        // ### grunt-mocha-cli
        mochacli: {
            options: {
                ui: 'bdd',
                reporter: grunt.option('reporter') || 'spec',
                timeout: '60000',
                require: ['core/server/overrides'],
                flags: ['--trace-warnings'],
                exit: true
            },

            unit: {
                src: [
                    'test/unit/**/*_spec.js'
                ]
            },

            acceptance: {
                src: [
                    'test/api-acceptance/**/*_spec.js',
                    'test/frontend-acceptance/**/*_spec.js'
                ]
            },

            regression: {
                src: [
                    'test/regression/**/*_spec.js'
                ]
            },

            // #### Run single test (src is set dynamically, see grunt task 'test')
            single: {}
        },

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

        // ### grunt-shell
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

        // ### grunt-contrib-clean
        // Clean up files as part of other tasks
        clean: {
            built: {
                src: [
                    'core/built/**'
                ]
            },
            release: {
                src: ['<%= paths.releaseBuild %>/**']
            },
            tmp: {
                src: ['.tmp/**']
            },
            dependencies: {
                src: ['node_modules/**', 'core/client/node_modules/**']
            }
        },

        // ### grunt-contrib-compress
        // Zip up files for builds / releases
        compress: {
            release: {
                options: {
                    archive: '<%= paths.releaseDist %>/Ghost-<%= pkg.version %>.zip'
                },
                expand: true,
                cwd: '<%= paths.releaseBuild %>/',
                src: ['**']
            }
        },

        // ### grunt-update-submodules
        // Grunt task to update git submodules
        update_submodules: {
            pinned: {
                options: {
                    params: '--init'
                }
            }
        },

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

        // ### grunt-subgrunt
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

        // ### grunt-contrib-symlink
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

    // Load the configuration
    grunt.initConfig(cfg);

    // This ensures that the tests get run under the correct environment, using the correct database, and that they work as expected.
    grunt.registerTask('setTestEnv',
        'Use "testing" Ghost config; unless we are running on CI',
        function () {
            process.env.NODE_ENV = process.env.NODE_ENV || 'testing';
        });

    // @TODO: fix this - it's only used for a handful of regression tests
    // Creates stub files in the built directory and the views directory so that the test environments do not need to build out the client files
    grunt.registerTask('stubClientFiles', function () {
        cfg.clientFiles.forEach((file) => {
            const filePath = path.resolve(cwd + '/core/' + file);
            fs.ensureFileSync(filePath);
        });
    });

    // ### Test
    // `grunt test:unit/apps_spec.js` will run just the tests inside the apps_spec.js file
    //
    // It works for any path relative to the /test/ folder. It will also run all the tests in a single directory
    // You can also run a test with grunt test:test/unit/... to get bash autocompletion
    //
    // `grunt test:regression/api` - runs the api regression tests
    grunt.registerTask('test', 'Run a particular spec file from the /test/ directory e.g. `grunt test:unit/apps_spec.js`', function (test) {
        if (!test) {
            grunt.fail.fatal('No test provided. `grunt test` expects a filename. e.g.: `grunt test:unit/apps_spec.js`. Did you mean `yarn test`?');
        }

        if (!test.match(/test\//) && !test.match(/core\/server/)) {
            test = 'test/' + test;
        }

        // CASE: execute folder
        if (!test.match(/.js/)) {
            test += '/**';
        } else if (!fs.existsSync(test)) {
            grunt.fail.fatal('This file does not exist!');
        }

        cfg.mochacli.single.src = [test];
        grunt.initConfig(cfg);
        grunt.task.run('setTestEnv', 'mochacli:single');
    });

    // Linting via grunt is deprecated
    grunt.registerTask('lint', function () {
        grunt.log.error('@deprecated: Use `yarn lint` instead');
    });

    grunt.registerTask('test-unit', 'Run unit tests (mocha)',
        ['setTestEnv', 'mochacli:unit']
    );

    grunt.registerTask('test-regression', 'Run regression tests.',
        ['setTestEnv', 'stubClientFiles', 'mochacli:regression']
    );

    grunt.registerTask('test-acceptance', 'Run acceptance tests',
        ['setTestEnv', 'mochacli:acceptance']
    );

    // ## Building assets
    //
    // Ghost's GitHub repository contains the un-built source code for Ghost. If you're looking for the already
    // built release zips, you can get these from the [release page](https://github.com/TryGhost/Ghost/releases) on
    // GitHub or from https://ghost.org/docs/install/.
    //
    // If you want to work on Ghost core, or you want to use the source files from GitHub, then you have to build
    // the Ghost assets in order to make them work.

    // ### Init assets
    // `grunt init` - will run an initial asset build for you
    //
    // Grunt init runs `yarn install` inside `core/client` as well as the standard asset build
    // tasks which occur when you run just `grunt`. This fetches the latest client-side dependencies.
    //
    // This task is very important, and should always be run when fetching down an updated code base just after
    // running `yarn install`.
    //
    grunt.registerTask('init', 'Prepare the project for development',
        ['update_submodules:pinned', 'subgrunt:init', 'clean:tmp', 'default']);

    // ### Build assets
    // `grunt build` - will build client assets (without updating the submodule)
    //
    // This task is identical to `grunt init`, except it does not build client dependencies
    grunt.registerTask('build', 'Build client app',
        ['subgrunt:init', 'clean:tmp', 'default']);

    // ### Default asset build
    // `grunt` - default grunt task
    //
    // Build assets and dev version of the admin app.
    grunt.registerTask('default', 'Build JS & templates for development',
        ['subgrunt:dev']);

    // ### Production assets
    // `grunt prod` - will build the minified assets used in production.
    //
    // It is otherwise the same as running `grunt`, but is only used when running Ghost in the `production` env.
    grunt.registerTask('prod', 'Build JS & templates for production',
        ['subgrunt:prod', 'postcss:prod']);

    // ### Live reload
    // `grunt dev` - build assets on the fly whilst developing
    //
    // If you want Ghost to live reload for you whilst you're developing, you can do this by running `grunt dev`.
    // This works hand-in-hand with the [livereload](http://livereload.com/) chrome extension.
    //
    // `grunt dev` manages starting an express server and restarting the server whenever core files change (which
    // require a server restart for the changes to take effect) and also manage reloading the browser whenever
    // frontend code changes.
    //
    // Note that the current implementation of watch only works with casper, not other themes.
    grunt.registerTask('dev', 'Dev Mode; watch files and restart server on changes', function () {
        if (grunt.option('client')) {
            grunt.task.run(['clean:built', 'bgShell:client']);
        } else if (grunt.option('server')) {
            grunt.task.run(['express:dev', 'watch']);
        } else {
            grunt.task.run(['clean:built', 'bgShell:client', 'express:dev', 'watch']);
        }
    });

    // ### grunt main
    // This command helps you to bring your working directory back to current main.
    // It will also update your dependencies to main and shows you if your database is healthy.
    // It won't build the client!
    //
    // `grunt main` [`upstream` is the default upstream to pull from]
    // `grunt main --upstream=parent`
    grunt.registerTask('main', 'Update your current working folder to latest main.',
        ['shell:main', 'subgrunt:init']
    );

    grunt.registerTask('master', 'Backwards compatible alias for `grunt main`.', 'main');

    // ### Release
    // Run `grunt release` to create a Ghost release zip file.
    // Uses the files specified by `.npmignore` to know what should and should not be included.
    // Runs the asset generation tasks for production and duplicates default-prod.html to default.html
    // so it can be run in either production or development, and packages all the files up into a zip.
    grunt.registerTask('release',
        'Release task - creates a final built zip\n' +
        ' - Do our standard build steps \n' +
        ' - Copy files to release-folder/#/#{version} directory\n' +
        ' - Clean out unnecessary files (.git*, etc)\n' +
        ' - Zip files in release-folder to dist-folder/#{version} directory',
        function () {
            grunt.config.set('copy.release', {
                expand: true,
                // #### Build File Patterns
                // A list of files and patterns to include when creating a release zip.
                // This is read from the `.npmignore` file and all patterns are inverted as the `.npmignore`
                // file defines what to ignore, whereas we want to define what to include.
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

module.exports = configureGrunt;
