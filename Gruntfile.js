// # Task automation for Ghost
//
// Run various tasks when developing for and working with Ghost.
//
// **Usage instructions:** can be found in the [Custom Tasks](#custom%20tasks) section or by running `grunt --help`.
//
// **Debug tip:** If you have any problems with any Grunt tasks, try running them with the `--verbose` command

require('./core/server/overrides');

const config = require('./core/shared/config');
const urlService = require('./core/frontend/services/url');
const _ = require('lodash');
const fs = require('fs-extra');
const KnexMigrator = require('knex-migrator');
const knexMigrator = new KnexMigrator({
    knexMigratorFilePath: config.get('paths:appRoot')
});

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
    grunt.loadNpmTasks('grunt-contrib-uglify');
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
                    'core/index.js',
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
            },
            test: {
                options: {
                    node_env: 'testing'
                }
            }
        },

        // ### grunt-mocha-cli
        mochacli: {
            options: {
                ui: 'bdd',
                reporter: grunt.option('reporter') || 'spec',
                timeout: '60000',
                require: ['core/server/overrides'],
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
            lint: {
                command: 'yarn lint'
            },
            master: {
                command: function () {
                    const upstream = grunt.option('upstream') || process.env.GHOST_UPSTREAM || 'upstream';
                    grunt.log.writeln('Pulling down the latest master from ' + upstream);
                    return `
                        git submodule sync
                        git submodule update

                        if ! git diff --exit-code --quiet --ignore-submodules=untracked; then
                            echo "Working directory is not clean, do you have uncommitted changes? Please commit, stash or discard changes to continue."
                            exit 1
                        fi

                        git checkout master
                        git pull ${upstream} master
                        yarn
                        git submodule foreach "
                            git checkout master && git pull ${upstream} master
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
            test: {
                src: ['content/data/ghost-test.db']
            },
            tmp: {
                src: ['.tmp/**']
            },
            dependencies: {
                src: ['node_modules/**', 'core/client/bower_components/**', 'core/client/node_modules/**']
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

        uglify: {
            prod: {
                options: {
                    sourceMap: false
                },
                files: {
                    'core/server/public/members.min.js': 'core/server/public/members.js'
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
                    'core/client': ['shell:ember:watch', '--live-reload-base-url="' + urlService.utils.getSubdir() + '/ghost/"']
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

    // # Custom Tasks

    // Ghost has a number of useful tasks that we use every day in development. Tasks marked as *Utility* are used
    // by grunt to perform current actions, but isn't useful to developers.
    //
    // Skip ahead to the section on:
    //
    // * [Building assets](#building%20assets):
    //     `grunt init`, `grunt` & `grunt prod` or live reload with `grunt dev`
    // * [Testing](#testing):
    //     `grunt validate`, the `grunt test-*` sub-tasks.

    // ### Help
    // Run `grunt help` on the commandline to get a print out of the available tasks and details of
    // what each one does along with any available options. This is an alias for `grunt --help`
    grunt.registerTask('help',
        'Outputs help information if you type `grunt help` instead of `grunt --help`',
        function () {
            grunt.log.writeln('Type `grunt --help` to get the details of available grunt tasks.');
        });

    // ## Testing

    // Ghost has an extensive set of test suites. The following section documents the various types of tests
    // and how to run them.
    //
    // TLDR; run `grunt validate`

    // #### Set Test Env *(Utility Task)*
    // Set the NODE_ENV to 'testing' unless the environment is already set to TRAVIS.
    // This ensures that the tests get run under the correct environment, using the correct database, and
    // that they work as expected. Trying to run tests with no ENV set will throw an error to do with `client`.
    grunt.registerTask('setTestEnv',
        'Use "testing" Ghost config; unless we are running on travis (then show queries for debugging)',
        function () {
            process.env.NODE_ENV = process.env.NODE_ENV || 'testing';
            cfg.express.test.options.node_env = process.env.NODE_ENV;
        });

    // ### Test
    // **Testing utility**
    //
    // `grunt test:unit/apps_spec.js` will run just the tests inside the apps_spec.js file
    //
    // It works for any path relative to the /test/ folder. It will also run all the tests in a single directory
    // You can also run a test with grunt test:test/unit/... to get bash autocompletion
    //
    // `grunt test:regression/api` - runs the api regression tests
    grunt.registerTask('test', 'Run a particular spec file from the /test/ directory e.g. `grunt test:unit/apps_spec.js`', function (test) {
        if (!test) {
            grunt.fail.fatal('No test provided. `grunt test` expects a filename. e.g.: `grunt test:unit/apps_spec.js`. Did you mean `npm test` or `grunt validate`?');
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
        grunt.task.run('test-setup', 'mochacli:single');
    });

    // #### Stub out ghost files *(Utility Task)*
    // Creates stub files in the built directory and the views directory
    // so that the test environments do not need to build out the client files
    grunt.registerTask('stubClientFiles', function () {
        _.each(cfg.clientFiles, function (file) {
            const filePath = path.resolve(cwd + '/core/' + file);
            fs.ensureFileSync(filePath);
        });
    });

    /**
     * Ensures the target database get's automatically created.
     */
    grunt.registerTask('knex-migrator', function () {
        return knexMigrator.init({noScripts: true});
    });

    // ### Validate
    // **Main testing task**
    //
    // `grunt validate` will either run all tests or run linting
    // `grunt validate` is called by `yarn test` and is used by Travis.
    grunt.registerTask('validate', 'Run tests', function () {
        grunt.task.run(['test-acceptance', 'test-unit']);
    });

    grunt.registerTask('test-all', 'Run all server tests',
        ['test-acceptance', 'test-unit', 'test-regression']);

    // ### Lint
    //
    // `grunt lint` will run the linter
    grunt.registerTask('lint', 'Run the code style checks for server & tests',
        ['shell:lint']
    );

    // ### test-setup *(utility)(
    // `grunt test-setup` will run all the setup tasks required for running tests
    grunt.registerTask('test-setup', 'Setup ready to run tests',
        ['knex-migrator', 'clean:test', 'setTestEnv', 'stubClientFiles']
    );

    // ### Unit Tests *(sub task)*
    // `grunt test-unit` will run just the unit tests
    //
    // If you need to run an individual unit test file, you can use the `grunt test:<file_path>` task:
    //
    // `grunt test:unit/config_spec.js`
    //
    // This also works for folders (although it isn't recursive), E.g.
    //
    // `grunt test:unit/helpers`
    //
    // Unit tests are run with [mocha](http://mochajs.org/) using
    // [should](https://github.com/visionmedia/should.js) to describe the tests in a highly readable style.
    // Unit tests do **not** touch the database.
    grunt.registerTask('test-unit', 'Run unit tests (mocha)',
        ['test-setup', 'mochacli:unit']
    );

    grunt.registerTask('test-regression', 'Run regression tests.',
        ['test-setup', 'mochacli:regression']
    );

    grunt.registerTask('test-acceptance', 'Run acceptance tests',
        ['test-setup', 'mochacli:acceptance']
    );

    // ## Building assets
    //
    // Ghost's GitHub repository contains the un-built source code for Ghost. If you're looking for the already
    // built release zips, you can get these from the [release page](https://github.com/TryGhost/Ghost/releases) on
    // GitHub or from https://ghost.org/download. These zip files are created using the [grunt release](#release)
    // task.
    //
    // If you want to work on Ghost core, or you want to use the source files from GitHub, then you have to build
    // the Ghost assets in order to make them work.
    //
    // There are a number of grunt tasks available to help with this. Firstly after fetching an updated version of
    // the Ghost codebase, after running `yarn install`, you will need to run [grunt init](#init%20assets).
    //
    // For production blogs you will need to run [grunt prod](#production%20assets).
    //
    // For updating assets during development, the tasks [grunt](#default%20asset%20build) and
    // [grunt dev](#live%20reload) are available.

    // ### Init assets
    // `grunt init` - will run an initial asset build for you
    //
    // Grunt init runs `yarn install && bower install` inside `core/client` as well as the standard asset build
    // tasks which occur when you run just `grunt`. This fetches the latest client-side dependencies.
    //
    // This task is very important, and should always be run when fetching down an updated code base just after
    // running `yarn install`.
    //
    // `bower` does have some quirks, such as not running as root. If you have problems please try running
    // `grunt init --verbose` to see if there are any errors.
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
        ['subgrunt:prod', 'uglify:prod', 'postcss:prod']);

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

    // ### grunt master
    // This command helps you to bring your working directory back to current master.
    // It will also update your dependencies to master and shows you if your database is healthy.
    // It won't build the client!
    //
    // `grunt master` [`upstream` is the default upstream to pull from]
    // `grunt master --upstream=parent`
    grunt.registerTask('master', 'Update your current working folder to latest master.',
        ['shell:master', 'subgrunt:init']
    );

    // ### Release
    // Run `grunt release` to create a Ghost release zip file.
    // Uses the files specified by `.npmignore` to know what should and should not be included.
    // Runs the asset generation tasks for production and duplicates default-prod.html to default.html
    // so it can be run in either production or development, and packages all the files up into a zip.
    grunt.registerTask('release',
        'Release task - creates a final built zip\n' +
        ' - Do our standard build steps \n' +
        ' - Copy files to release-folder/#/#{version} directory\n' +
        ' - Clean out unnecessary files (travis, .git*, etc)\n' +
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

            grunt.task
                .run('update_submodules:pinned')
                .run('subgrunt:init')
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
