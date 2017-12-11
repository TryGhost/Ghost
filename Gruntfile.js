// # Task automation for Ghost
//
// Run various tasks when developing for and working with Ghost.
//
// **Usage instructions:** can be found in the [Custom Tasks](#custom%20tasks) section or by running `grunt --help`.
//
// **Debug tip:** If you have any problems with any Grunt tasks, try running them with the `--verbose` command

require('./core/server/overrides');

var config = require('./core/server/config'),
    urlService = require('./core/server/services/url'),
    _ = require('lodash'),
    chalk = require('chalk'),
    fs = require('fs-extra'),
    KnexMigrator = require('knex-migrator'),
    knexMigrator = new KnexMigrator({
        knexMigratorFilePath: config.get('paths:appRoot')
    }),

    path = require('path'),

    escapeChar = process.platform.match(/^win/) ? '^' : '\\',
    cwd = process.cwd().replace(/( |\(|\))/g, escapeChar + '$1'),
    buildDirectory = path.resolve(cwd, '.build'),
    distDirectory = path.resolve(cwd, '.dist'),

    // ## Grunt configuration

    configureGrunt = function (grunt) {
        // #### Load all grunt tasks
        //
        // Find all of the task which start with `grunt-` and load them, rather than explicitly declaring them all
        require('matchdep').filterDev(['grunt-*', '!grunt-cli']).forEach(grunt.loadNpmTasks);

        var cfg = {
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
            watch: {
                livereload: {
                    files: [
                        'content/themes/casper/assets/css/*.css',
                        'content/themes/casper/assets/js/*.js'
                    ],
                    options: {
                        livereload: true
                    }
                },
                express: {
                    files: ['core/ghost-server.js', 'core/server/**/*.js', 'config.*.json', '!config.testing.json'],
                    tasks: ['express:dev'],
                    options: {
                        nospawn: true,
                        livereload: true
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

            // ### grunt-eslint
            // Linting rules, run as part of `grunt validate`. See [grunt validate](#validate) and its subtasks for
            // more information.
            eslint: {
                server: {
                    options: {
                        config: '.eslintrc.json'
                    },
                    src: [
                        '*.js',
                        'core/*.js',
                        'core/server/*.js',
                        'core/server/**/*.js',
                        '!core/server/public/**/*.js'
                    ]
                },
                test: {
                    options: {
                        config: './core/test/.eslintrc.json'
                    },
                    src: [
                        'core/test/*.js',
                        'core/test/**/*.js',
                        '!core/test/coverage/**'
                    ]
                }
            },

            // ### grunt-mocha-cli
            // Configuration for the mocha test runner, used to run unit, integration and route tests as part of
            // `grunt validate`. See [grunt validate](#validate) and its sub tasks for more information.
            mochacli: {
                options: {
                    ui: 'bdd',
                    reporter: grunt.option('reporter') || 'spec',
                    timeout: '30000',
                    save: grunt.option('reporter-output'),
                    require: ['core/server/overrides'],
                    exit: true
                },

                // #### All Unit tests
                unit: {
                    src: [
                        'core/test/unit/**/*_spec.js'
                    ]
                },

                // #### All Integration tests
                integration: {
                    src: [
                        'core/test/integration/**/*_spec.js'
                    ]
                },

                // #### All Route tests
                routes: {
                    src: [
                        'core/test/functional/routes/**/*_spec.js'
                    ]
                },

                // #### All Module tests
                module: {
                    src: [
                        'core/test/functional/module/**/*_spec.js'
                    ]
                },

                // #### Run single test (src is set dynamically, see grunt task 'test')
                single: {}
            },

            // ### grunt-mocha-istanbul
            // Configuration for the mocha test coverage generator
            // `grunt coverage`.
            mocha_istanbul: {
                coverage: {
                    // they can also have coverage generated for them & the order doesn't matter
                    src: [
                        'core/test/unit'
                    ],
                    options: {
                        mask: '**/*_spec.js',
                        coverageFolder: 'core/test/coverage/unit',
                        mochaOptions: ['--timeout=15000', '--require', 'core/server/overrides', '--exit'],
                        excludes: ['core/client', 'core/server/built']
                    }
                },
                coverage_all: {
                    src: [
                        'core/test/integration',
                        'core/test/functional',
                        'core/test/unit'
                    ],
                    options: {
                        coverageFolder: 'core/test/coverage/all',
                        mask: '**/*_spec.js',
                        mochaOptions: ['--timeout=15000', '--require', 'core/server/overrides', '--exit'],
                        excludes: ['core/client', 'core/server/built']
                    }

                }
            },

            bgShell: {
                client: {
                    cmd: 'grunt subgrunt:watch',
                    bg: grunt.option('client') ? false : true,
                    stdout: function (chunk) {
                        // hide certain output to prevent confusion when running alongside server
                        var filter = grunt.option('client') ? false : [
                            /> ghost-admin/,
                            /^Livereload/,
                            /^Serving on/
                        ].some(function (regexp) {
                            return regexp.test(chunk);
                        });

                        if (!filter) {
                            grunt.log.write(chunk);
                        }
                    },
                    stderr: true
                }
            },

            // ### grunt-shell
            // Command line tools where it's easier to run a command directly than configure a grunt plugin
            shell: {
                master: {
                    command: function () {
                        var upstream = grunt.option('upstream') || process.env.GHOST_UPSTREAM || 'upstream';
                        grunt.log.writeln('Pulling down the latest master from ' + upstream);
                        return 'git checkout master; git pull ' + upstream + ' master; ' +
                            'yarn; git submodule foreach "git checkout master && git pull ' +
                            upstream + ' master"';
                    }
                },

                dbhealth: {
                    command: 'knex-migrator health'
                }
            },

            // ### grunt-docker
            // Generate documentation from code
            docker: {
                docs: {
                    dest: 'docs',
                    src: ['.'],
                    options: {
                        onlyUpdated: true,
                        exclude: 'node_modules,bower_components,content,core/client,*test,*doc*,' +
                        '*vendor,config.*.json,*buil*,.dist*,.idea,.git*,.travis.yml,.bower*,.editorconfig,.js*,*.md,' +
                        'MigratorConfig.js'
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
                        'core/server/public/ghost-sdk.min.js': 'core/server/public/ghost-sdk.js'
                    }
                }
            },

            cssnano: {
                prod: {
                    options: {
                        sourcemap: false
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
        //     `grunt validate`, the `grunt test-*` sub-tasks or generate a coverage report with `grunt coverage`.

        // ### Help
        // Run `grunt help` on the commandline to get a print out of the available tasks and details of
        // what each one does along with any available options. This is an alias for `grunt --help`
        grunt.registerTask('help',
            'Outputs help information if you type `grunt help` instead of `grunt --help`',
            function () {
                grunt.log.writeln('Type `grunt --help` to get the details of available grunt tasks.');
            });

        // ### Documentation
        // Run `grunt docs` to generate annotated source code using the documentation described in the code comments.
        grunt.registerTask('docs', 'Generate Docs', ['docker']);

        // Run `grunt watch-docs` to setup livereload & watch whilst you're editing the docs
        grunt.registerTask('watch-docs', function () {
            grunt.config.merge({
                watch: {
                    docs: {
                        files: ['core/server/**/*', 'index.js', 'Gruntfile.js'],
                        tasks: ['docker'],
                        options: {
                            livereload: true
                        }
                    }
                }
            });

            grunt.task.run('watch:docs');
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
                process.env.NODE_ENV = process.env.TRAVIS ? process.env.NODE_ENV : 'testing';
                cfg.express.test.options.node_env = process.env.NODE_ENV;
            });

        // ### Test
        // **Testing utility**
        //
        // `grunt test:unit/apps_spec.js` will run just the tests inside the apps_spec.js file
        //
        // It works for any path relative to the core/test folder. It will also run all the tests in a single directory
        // You can also run a test with grunt test:core/test/unit/... to get bash autocompletion
        //
        // `grunt test:integration/api` - runs the api integration tests
        // `grunt test:integration` - runs the integration tests in the root folder and excludes all api & model tests
        grunt.registerTask('test', 'Run a particular spec file from the core/test directory e.g. `grunt test:unit/apps_spec.js`', function (test) {
            if (!test) {
                grunt.fail.fatal('No test provided. `grunt test` expects a filename. e.g.: `grunt test:unit/apps_spec.js`. Did you mean `npm test` or `grunt validate`?');
            }

            if (!test.match(/core\/test/) && !test.match(/core\/server/)) {
                test = 'core/test/' + test;
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
                var filePath = path.resolve(cwd + '/core/' + file);
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
        // `grunt validate` is called by `npm test` and is used by Travis.
        grunt.registerTask('validate', 'Run tests or lint code', function () {
            if (process.env.TEST_SUITE === 'lint') {
                return grunt.task.run(['lint']);
            }

            grunt.task.run(['test-all']);
        });

        // ### Test-All
        // **Main testing task**
        //
        // `grunt test-all` will lint and test your pre-built local Ghost codebase.
        //
        grunt.registerTask('test-all', 'Run all server tests',
            ['test-routes', 'test-module', 'test-unit', 'test-integration']);

        // ### Lint
        //
        // `grunt lint` will run the linter
        grunt.registerTask('lint', 'Run the code style checks for server & tests',
            ['eslint']
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
        // A coverage report can be generated for these tests using the `grunt test-coverage` task.
        grunt.registerTask('test-unit', 'Run unit tests (mocha)',
            ['test-setup', 'mochacli:unit']
        );

        // ### Integration tests *(sub task)*
        // `grunt test-integration` will run just the integration tests
        //
        // Provided you already have a `config.*.json` file, you can run just the model integration tests by running:
        //
        // `grunt test:integration/model`
        //
        // Or just the api integration tests by running:
        //
        // `grunt test:integration/api`
        //
        // Integration tests are run with [mocha](http://mochajs.org/) using
        // [should](https://github.com/visionmedia/should.js) to describe the tests in a highly readable style.
        // Integration tests are different to the unit tests because they make requests to the database.
        //
        // If you need to run an individual integration test file you can use the `grunt test:<file_path>` task:
        //
        // `grunt test:integration/api/api_tags_spec.js`
        //
        // Their purpose is to test that both the api and models behave as expected when the database layer is involved.
        // These tests are run against sqlite3 and mysql on travis and ensure that differences between the databases
        // don't cause bugs.
        //
        // A coverage report can be generated for these tests using the `grunt test-coverage` task.
        grunt.registerTask('test-integration', 'Run integration tests (mocha + db access)',
            ['test-setup', 'mochacli:integration']
        );

        // ### Route tests *(sub task)*
        // `grunt test-routes` will run just the route tests
        //
        // If you need to run an individual route test file, you can use the `grunt test:<file_path>` task:
        //
        // `grunt test:functional/routes/admin_spec.js`
        //
        // Route tests are run with [mocha](http://mochajs.org/) using
        // [should](https://github.com/visionmedia/should.js) and [supertest](https://github.com/visionmedia/supertest)
        // to describe and create the tests.
        //
        // Supertest enables us to describe requests that we want to make, and also describe the response we expect to
        // receive back. It works directly with express, so we don't have to run a server to run the tests.
        //
        // The purpose of the route tests is to ensure that all of the routes (pages, and API requests) in Ghost
        // are working as expected, including checking the headers and status codes received. It is very easy and
        // quick to test many permutations of routes / urls in the system.
        grunt.registerTask('test-routes', 'Run functional route tests (mocha)',
            ['test-setup', 'mochacli:routes']
        );

        // ### Module tests *(sub task)*
        // `grunt test-module` will run just the module tests
        //
        // The purpose of the module tests is to ensure that Ghost can be used as an npm module and exposes all
        // required methods to interact with it.
        grunt.registerTask('test-module', 'Run functional module tests (mocha)',
            ['test-setup', 'mochacli:module']
        );

        // ### Coverage
        // `grunt coverage` will generate a report for the Unit Tests.
        //
        // This is not currently done as part of CI or any build, but is a tool we have available to keep an eye on how
        // well the unit and integration tests are covering the code base.
        // Ghost does not have a minimum coverage level - we're more interested in ensuring important and useful areas
        // of the codebase are covered, than that the whole codebase is covered to a particular level.
        //
        // Key areas for coverage are: helpers and theme elements, apps / GDK, the api and model layers.

        grunt.registerTask('coverage', 'Generate unit and integration (mocha) tests coverage report',
            ['test-setup', 'mocha_istanbul:coverage']
        );

        grunt.registerTask('coverage-all', 'Generate unit and integration tests coverage report',
            ['test-setup', 'mocha_istanbul:coverage_all']
        );

        // #### Master Warning *(Utility Task)*
        // Warns git users not ot use the `master` branch in production.
        // `master` is an unstable branch and shouldn't be used in production as you run the risk of ending up with a
        // database in an unrecoverable state. Instead there is a branch called `stable` which is the equivalent of the
        // release zip for git users.
        grunt.registerTask('master-warn',
            'Outputs a warning to runners of grunt prod, that master shouldn\'t be used for live blogs',
            function () {
                grunt.log.writeln(chalk.red(
                    'Use the ' + chalk.bold('stable') + ' branch for live blogs. '
                    + chalk.bold.underline('Never') + ' master!'
                ));
                grunt.log.writeln('>', 'Always two there are, no more, no less. A master and a ' + chalk.bold('stable') + '.');
            });

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
            ['subgrunt:prod', 'uglify:prod', 'cssnano:prod', 'master-warn']);

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
            ['shell:master', 'subgrunt:init', 'shell:dbhealth']
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

                grunt.task.run(['update_submodules:pinned', 'subgrunt:init', 'clean:built', 'clean:tmp', 'prod', 'clean:release', 'copy:admin_html', 'copy:release', 'compress:release']);
            }
        );
    };

module.exports = configureGrunt;
