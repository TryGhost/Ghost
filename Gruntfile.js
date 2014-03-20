// # Gruntfile - Task automation for Ghost
// Run various tasks when developing for and working with Ghost
// Run `grunt --help` or visit https://github.com/TryGhost/Ghost/wiki/Grunt-Toolkit/ for usage instructions

var path           = require('path'),
    when           = require('when'),
    semver         = require('semver'),
    fs             = require('fs'),
    _              = require('lodash'),
    spawn          = require('child_process').spawn,
    buildDirectory = path.resolve(process.cwd(), '.build'),
    distDirectory  = path.resolve(process.cwd(), '.dist'),
    bootstrap      = require('./core/bootstrap'),


    // ## Build File Patterns
    // a list of files and paterns to process and exclude when running builds & releases
    // It is taken from the .npmignore file and all patterns are inverted as the .npmignore
    // file defines what to ignore, whereas we want to define what to include.
    buildGlob = (function () {
        /*jslint stupid:true */
        return fs.readFileSync('.npmignore', {encoding: 'utf8'}).split('\n').map(function (pattern) {
            if (pattern[0] === '!') {
                return pattern.substr(1);
            }
            return '!' + pattern;
        });
    }()),

    // ## Grunt configuration

    configureGrunt = function (grunt) {

        // load all grunt tasks
        require('matchdep').filterDev(['grunt-*', '!grunt-cli']).forEach(grunt.loadNpmTasks);

        var cfg = {
            // Common paths to be used by tasks
            paths: {
                adminAssets: './core/client/assets',
                build: buildDirectory,
                releaseBuild: path.join(buildDirectory, 'release'),
                dist: distDirectory,
                releaseDist: path.join(distDirectory, 'release')
            },
            buildType: 'Build',
            pkg: grunt.file.readJSON('package.json'),

            // ### Config for grunt-contrib-watch
            // Watch files and livereload in the browser during development
            watch: {
                handlebars: {
                    files: ['core/client/tpl/**/*.hbs'],
                    tasks: ['handlebars']
                },
                concat: {
                    files: [
                        'core/client/*.js',
                        'core/client/**/*.js'
                    ],
                    tasks: ['concat']
                },
                'ghost-ui': {
                    files: [
                        // Ghost UI CSS
                        'bower_components/ghost-ui/dist/css/*.css'
                    ],
                    tasks: ['copy:dev']
                },
                livereload: {
                    files: [
                        // Theme CSS
                        'content/themes/casper/css/*.css',
                        // Theme JS
                        'content/themes/casper/js/*.js',
                        // Client CSS
                        'core/client/assets/css/*.css',
                        // Admin JS
                        'core/built/scripts/*.js'
                    ],
                    options: {
                        livereload: true
                    }
                },
                express: {
                    // Restart any time client or server js files change
                    files:  ['core/server.js', 'core/server/**/*.js'],
                    tasks:  ['express:dev'],
                    options: {
                        //Without this option specified express won't be reloaded
                        nospawn: true
                    }
                }
            },

            // ### Config for grunt-express-server
            // Start our server in development
            express: {
                options: {
                    script: 'index.js',
                    output: 'Ghost is running'
                },

                dev: {
                    options: {
                        //output: 'Express server listening on address:.*$'
                    }
                },
                test: {
                    options: {
                        node_env: 'testing'
                    }
                }
            },

            // ### Config for grunt-contrib-jshint
            // JSHint all the things!
            jshint: {
                server: {
                    options: {
                        // node environment
                        node: true,
                        // browser environment
                        browser: false,
                        // allow dangling underscores in var names
                        nomen: false,
                        // don't require use strict pragma
                        strict: false,
                        sub: true,
                        eqeqeq: true,
                        laxbreak: true,
                        bitwise: true,
                        curly: true,
                        forin: true,
                        immed: true,
                        latedef: true,
                        newcap: true,
                        noarg: true,
                        noempty: true,
                        nonew: true,
                        plusplus: true,
                        regexp: true,
                        undef: true,
                        unused: true,
                        trailing: true,
                        indent: 4,
                        onevar: true,
                        white: true
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
                    options: {
                        "predef": {
                            "document": true,
                            "window": true,
                            "location": true,
                            "setTimeout": true,
                            "Ember": true,
                            "Em": true,
                            "DS": true,
                            "$": true
                        },
                        // node environment
                        node: false,
                        // browser environment
                        browser: true,
                        // allow dangling underscores in var names
                        nomen: false,
                        bitwise: true,
                        curly: true,
                        eqeqeq: true,
                        forin: true,
                        immed: true,
                        latedef: true,
                        newcap: true,
                        noarg: true,
                        noempty: true,
                        nonew: true,
                        plusplus: true,
                        regexp: true,
                        undef: true,
                        unused: true,
                        trailing: true,
                        indent: 4,
                        esnext: true,
                        onevar: true,
                        white: true
                    },
                    files: {
                        src: [
                            'core/client/**/*.js',
                            // Ignore files
                            '!core/client/assets/vendor/**/*.js',
                            '!core/client/tpl/**/*.js'
                        ]
                    }
                },
                shared: {
                    options: {
                        // node environment
                        node: true,
                        // browser environment
                        browser: false,
                        // don't require use strict pragma
                        strict: false,
                        // allow dangling underscores in var names
                        nomen: false,
                        bitwise: true,
                        curly: true,
                        eqeqeq: true,
                        forin: true,
                        immed: true,
                        latedef: true,
                        newcap: true,
                        noarg: true,
                        noempty: true,
                        nonew: true,
                        plusplus: true,
                        regexp: true,
                        undef: true,
                        unused: true,
                        trailing: true,
                        indent: 4,
                        onevar: true,
                        white: true
                    },
                    files: {
                        src: [
                            'core/shared/**/*.js',
                            // Ignore files
                            '!core/shared/vendor/**/*.js',
                            '!core/shared/lib/**/*.js'
                        ]
                    }
                }
            },

            // ### Config for grunt-mocha-cli
            // Run mocha unit tests
            mochacli: {
                options: {
                    ui: 'bdd',
                    reporter: 'spec',
                    timeout: '15000'
                },

                unit: {
                    src: ['core/test/unit/**/*_spec.js']
                },

                model: {
                    src: ['core/test/integration/**/model*_spec.js']
                },

                client: {
                    src: ['core/test/unit/**/client*_spec.js']
                },

                server: {
                    src: ['core/test/unit/**/server*_spec.js']
                },

                shared: {
                    src: ['core/test/unit/**/shared*_spec.js']
                },

                perm: {
                    src: ['core/test/unit/**/permissions_spec.js']
                },

                migrate: {
                    src: [
                        'core/test/unit/**/export_spec.js',
                        'core/test/unit/**/import_spec.js'
                    ]
                },

                storage: {
                    src: ['core/test/unit/**/storage*_spec.js']
                },

                integration: {
                    src: [
                        'core/test/integration/**/model*_spec.js',
                        'core/test/integration/**/api*_spec.js'
                    ]
                },

                api: {
                    src: ['core/test/functional/api/*_test.js']
                },

                routes: {
                    src: ['core/test/functional/routes/*_test.js']
                }
            },


            // ### config for grunt-shell
            // command line tools
            shell: {
                bower: {
                    command: path.resolve(__dirname + '/node_modules/.bin/bower install'),
                    options: {
                        stdout: true
                    }
                },
                // generate coverage report
                coverage: {
                    command: function () {
                        // will work on windows only if mocha is globally installed
                        var cmd = !!process.platform.match(/^win/) ? 'mocha' : './node_modules/mocha/bin/mocha';
                        return cmd + ' --timeout 15000 --reporter html-cov > coverage.html ./core/test/blanket_coverage.js';
                    },
                    execOptions: {
                        env: 'NODE_ENV=' + process.env.NODE_ENV
                    }
                }
            },

            // ### Config for grunt-contrib-handlebars
            // Compile templates for admin client
            handlebars: {
                core: {
                    options: {
                        namespace: 'JST',
                        processName: function (filename) {
                            filename = filename.replace('core/client/tpl/', '');
                            return filename.replace('.hbs', '');
                        }
                    },
                    files: {
                        'core/client/tpl/hbs-tpl.js': 'core/client/tpl/**/*.hbs'
                    }
                }
            },

            // ### Config for grunt-groc
            // Generate documentation from code
            groc: {
                docs: {
                    options: {
                        'out': './docs/',
                        'glob': [
                            'README.md',
                            'config.example.js',
                            'index.js',
                            'core/*.js',
                            'core/server/**/*.js',
                            'core/shared/**/*.js',
                            'core/client/**/*.js'
                        ],
                        'except': [
                            '!core/**/vendor/**/*.js',
                            '!core/client/tpl/**/*.js'
                        ]
                    }
                }
            },

            // ### Config for grunt-contrib-clean
            // Clean up files as part of other tasks
            clean: {
                release: {
                    src: ['<%= paths.releaseBuild %>/**']
                },
                test: {
                    src: ['content/data/ghost-test.db']
                }
            },

            // ### Config for grunt-contrib-copy
            // Prepare files for builds / releases
            copy: {
                dev: {
                    files: [{
                        cwd: 'bower_components/jquery/dist/',
                        src: 'jquery.js',
                        dest: 'core/built/public/',
                        expand: true
                    }, {
                        cwd: 'bower_components/ghost-ui/dist/',
                        src: ['**'],
                        dest: 'core/client/assets/',
                        expand: true
                    }]
                },
                prod: {
                    files: [{
                        cwd: 'bower_components/jquery/dist/',
                        src: 'jquery.js',
                        dest: 'core/built/public/',
                        expand: true
                    }, {
                        cwd: 'bower_components/ghost-ui/dist/',
                        src: ['**'],
                        dest: 'core/client/assets/',
                        expand: true
                    }]
                },
                release: {
                    files: [{
                        cwd: 'bower_components/jquery/dist/',
                        src: 'jquery.js',
                        dest: 'core/built/public/',
                        expand: true
                    }, {
                        cwd: 'bower_components/ghost-ui/dist/',
                        src: ['**'],
                        dest: 'core/client/assets/',
                        expand: true
                    }, {
                        expand: true,
                        src: buildGlob,
                        dest: '<%= paths.releaseBuild %>/'
                    }]
                }
            },

            // ### Config for grunt-contrib-compress
            // Zip up builds / releases
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

            // ### Config for grunt-contrib-concat
            // concatenate multiple JS files into a single file ready for use
            concat: {
                dev: {
                    files: {
                        'core/built/scripts/vendor.js': [
                            'bower_components/jquery/dist/jquery.js',
                            'bower_components/jquery-ui/ui/jquery-ui.js',
                            'core/client/assets/lib/jquery-utils.js',
                            'core/client/assets/lib/uploader.js',

                            'bower_components/lodash/dist/lodash.underscore.js',
                            'bower_components/backbone/backbone.js',
                            'bower_components/handlebars/handlebars.runtime.js',
                            'bower_components/moment/moment.js',
                            'bower_components/jquery-file-upload/js/jquery.fileupload.js',
                            'bower_components/codemirror/lib/codemirror.js',
                            'bower_components/codemirror/addon/mode/overlay.js',
                            'bower_components/codemirror/mode/markdown/markdown.js',
                            'bower_components/codemirror/mode/gfm/gfm.js',
                            'bower_components/showdown/src/showdown.js',
                            'bower_components/validator-js/validator.js',

                            'core/shared/lib/showdown/extensions/ghostimagepreview.js',
                            'core/shared/lib/showdown/extensions/ghostgfm.js',

                            // ToDo: Remove or replace
                            'core/client/assets/vendor/shortcuts.js',
                            'core/client/assets/vendor/to-title-case.js',

                            'bower_components/Countable/Countable.js',
                            'bower_components/fastclick/lib/fastclick.js',
                            'bower_components/nprogress/nprogress.js'
                        ],

                        'core/built/scripts/helpers.js': [
                            'core/client/init.js',

                            'core/client/mobile-interactions.js',
                            'core/client/toggle.js',
                            'core/client/markdown-actions.js',
                            'core/client/helpers/index.js',
                            'core/client/assets/lib/editor/index.js',
                            'core/client/assets/lib/editor/markerManager.js',
                            'core/client/assets/lib/editor/uploadManager.js',
                            'core/client/assets/lib/editor/markdownEditor.js',
                            'core/client/assets/lib/editor/htmlPreview.js',
                            'core/client/assets/lib/editor/scrollHandler.js',
                            'core/client/assets/lib/editor/mobileCodeMirror.js'
                        ],

                        'core/built/scripts/templates.js': [
                            'core/client/tpl/hbs-tpl.js'
                        ],

                        'core/built/scripts/models.js': [
                            'core/client/models/**/*.js'
                        ],

                        'core/built/scripts/views.js': [
                            'core/client/views/**/*.js',
                            'core/client/router.js'
                        ]
                    }
                },
                prod: {
                    files: {
                        'core/built/scripts/ghost.js': [
                            'bower_components/jquery/dist/jquery.js',
                            'bower_components/jquery-ui/ui/jquery-ui.js',
                            'core/client/assets/lib/jquery-utils.js',
                            'core/client/assets/lib/uploader.js',

                            'bower_components/lodash/dist/lodash.underscore.js',
                            'bower_components/backbone/backbone.js',
                            'bower_components/handlebars/handlebars.runtime.js',
                            'bower_components/moment/moment.js',
                            'bower_components/jquery-file-upload/js/jquery.fileupload.js',
                            'bower_components/codemirror/lib/codemirror.js',
                            'bower_components/codemirror/addon/mode/overlay.js',
                            'bower_components/codemirror/mode/markdown/markdown.js',
                            'bower_components/codemirror/mode/gfm/gfm.js',
                            'bower_components/showdown/src/showdown.js',
                            'bower_components/validator-js/validator.js',

                            'core/shared/lib/showdown/extensions/ghostimagepreview.js',
                            'core/shared/lib/showdown/extensions/ghostgfm.js',

                            // ToDo: Remove or replace
                            'core/client/assets/vendor/shortcuts.js',
                            'core/client/assets/vendor/to-title-case.js',

                            'bower_components/Countable/Countable.js',
                            'bower_components/fastclick/lib/fastclick.js',
                            'bower_components/nprogress/nprogress.js',

                            'core/client/init.js',

                            'core/client/mobile-interactions.js',
                            'core/client/toggle.js',
                            'core/client/markdown-actions.js',
                            'core/client/helpers/index.js',

                            'core/client/assets/lib/editor/index.js',
                            'core/client/assets/lib/editor/markerManager.js',
                            'core/client/assets/lib/editor/uploadManager.js',
                            'core/client/assets/lib/editor/markdownEditor.js',
                            'core/client/assets/lib/editor/htmlPreview.js',
                            'core/client/assets/lib/editor/scrollHandler.js',
                            'core/client/assets/lib/editor/mobileCodeMirror.js',

                            'core/client/tpl/hbs-tpl.js',

                            'core/client/models/**/*.js',

                            'core/client/views/**/*.js',

                            'core/client/router.js'
                        ]
                    }
                }
            },

            // ### Config for grunt-contrib-uglify
            // minify javascript file for production
            uglify: {
                prod: {
                    files: {
                        'core/built/scripts/ghost.min.js': 'core/built/scripts/ghost.js'
                    }
                }
            }
        };

        grunt.initConfig(cfg);

        // ## Custom Tasks

        grunt.registerTask('setTestEnv', 'Use "testing" Ghost config; unless we are running on travis (then show queries for debugging)', function () {
            process.env.NODE_ENV = process.env.TRAVIS ? 'travis-' + process.env.DB : 'testing';
            cfg.express.test.options.node_env = process.env.NODE_ENV;
        });

        grunt.registerTask('loadConfig', function () {
            var done = this.async();
            bootstrap().then(function () {
                done();
            });
        });

        grunt.registerTask('spawn-casperjs', function () {
            var done = this.async(),
                options = ['host', 'noPort', 'port', 'email', 'password'],
                args = ['test']
                           .concat(grunt.option('target') || ['admin/', 'frontend/'])
                           .concat(['--includes=base.js', '--verbose', '--log-level=debug', '--port=2369']);

            // Forward parameters from grunt to casperjs
            _.each(options, function processOption(option) {
                if (grunt.option(option)) {
                    args.push('--' + option + '=' + grunt.option(option));
                }
            });

            grunt.util.spawn({
                cmd: 'casperjs',
                args: args,
                opts: {
                    cwd: path.resolve('core/test/functional'),
                    stdio: 'inherit'
                }
            }, function (error, result, code) {
                /*jshint unused:false*/
                if (error) {
                    grunt.fail.fatal(result.stdout);
                }
                grunt.log.writeln(result.stdout);
                done();
            });
        });

        /* Generate Changelog
         * - Pulls changelog from git, excluding merges.
         * - Uses first line of commit message. Includes committer name.
         */
        grunt.registerTask('changelog', 'Generate changelog from Git', function () {
            // TODO: Break the contents of this task out into a separate module,
            // put on npm. (@cgiffard)

            var done = this.async();

            function git(args, callback, depth) {
                depth = depth || 0;

                if (!depth) {
                    grunt.log.writeln('git ' + args.join(' '));
                }

                var buffer = [];
                spawn('git', args, {
                    // We can reasonably assume the gruntfile will be in the root of the repo.
                    cwd : __dirname,

                    stdio : ['ignore', 'pipe', process.stderr]

                }).on('exit', function (code) {

                    // Process exited correctly but we got no output.
                    // Spawn again, but make sure we don't spiral out of control.
                    // Hack to work around an apparent node bug.
                    //
                    // Frustratingly, it's impossible to distinguish this
                    // bug from a genuine empty log.

                    if (!buffer.length && code === 0 && depth < 20) {
                        return setImmediate(function () {
                            git(args, callback, depth ? depth + 1 : 1);
                        });
                    }

                    if (code === 0) {
                        return callback(buffer.join(''));
                    }

                    // We failed. Git returned a non-standard exit code.
                    grunt.log.error('Git returned a non-zero exit code.');
                    done(false);

                // Push returned data into the buffer
                }).stdout.on('data', buffer.push.bind(buffer));
            }

            // Crazy function for getting around inconsistencies in tagging
            function sortTags(a, b) {
                a = a.tag;
                b = b.tag;

                // NOTE: Accounting for different tagging method for
                // 0.2.1 and up.

                // If we didn't have this issue I'd just pass rcompare
                // into sort directly. Could be something to think about
                // in future.

                if (semver.rcompare(a, '0.2.0') < 0 ||
                        semver.rcompare(b, '0.2.0') < 0) {

                    return semver.rcompare(a, b);
                }

                a = a.split('-');
                b = b.split('-');

                if (semver.rcompare(a[0], b[0]) !== 0) {
                    return semver.rcompare(a[0], b[0]);
                }

                // Using this janky looking integerising-method
                // because it's faster and doesn't result in NaN, which
                // breaks sorting
                /*jslint bitwise: true */
                return (+b[1] | 0) - (+a[1] | 0);
            }

            // Gets tags in master branch, sorts them with semver,
            function getTags(callback) {
                git(['show-ref', '--tags'], function (results) {
                    results = results
                        .split(/\n+/)
                        .filter(function (tag) {
                            return tag.length && tag.match(/\/\d+\.\d+/);
                        })
                        .map(function (tag) {
                            return {
                                'tag': tag.split(/tags\//).pop().trim(),
                                'ref': tag.split(/\s+/).shift().trim()
                            };
                        })
                        .sort(sortTags);

                    callback(results);
                });
            }

            // Parses log to extract commit data.
            function parseLog(data) {
                var commits = [],
                    commitRegex =
                        new RegExp(
                            '\\n*[|\\*\\s]*commit\\s+([a-f0-9]+)' +
                                '\\n[|\\*\\s]*Author:\\s+([^<\\n]+)<([^>\\n]+)>' +
                                '\\n[|\\*\\s]*Date:\\s+([^\\n]+)' +
                                '\\n+[|\\*\\s]*[ ]{4}([^\\n]+)',
                            'ig'
                        );

                // Using String.prototype.replace as a kind of poor-man's substitute
                // for a streaming parser.
                data.replace(
                    commitRegex,
                    function (wholeCommit, hash, author, email, date, message) {
                        /*jshint unused:false*/

                        // The author name and commit message may have trailing space.
                        author = author.trim();
                        message = message.trim();

                        // Reformat date to make it parse-able by JS
                        date =
                            date.replace(
                                /^(\w+)\s(\w+)\s(\d+)\s([\d\:]+)\s(\d+)\s([\+\-\d]+)$/,
                                '$1, $2 $3 $5 $4 $6'
                            );

                        commits.push({
                            'hash': hash,
                            'author': author,
                            'email': email,
                            'date': date,
                            'parsedDate': new Date(Date.parse(date)),
                            'message': message
                        });

                        return null;
                    }
                );

                return commits;
            }

            // Gets git log for specified range.
            function getLog(to, from, callback) {
                var range = from && to ? from + '..' + to : '',
                    args = [ 'log', 'master', '--no-color', '--no-merges', '--graph' ];

                if (range) {
                    args.push(range);
                }

                git(args, function (data) {
                    callback(parseLog(data));
                });
            }

            // Run the job
            getTags(function (tags) {
                var logPath = path.join(__dirname, 'CHANGELOG.md'),
                    log = fs.createWriteStream(logPath),
                    commitCache = {};

                function processTag(tag, callback) {
                    var buffer = '',
                        peek = tag[1];

                    tag = tag[0];

                    getLog(tag.tag, peek.tag, function (commits) {

                        // Use the comparison with HEAD to remove commits which
                        // haven't been included in a build/release yet.

                        if (tag.tag === 'HEAD') {
                            commits.forEach(function (commit) {
                                commitCache[commit.hash] = true;
                            });

                            return callback('');
                        }

                        buffer += '## Release ' + tag.tag + '\n';

                        commits = commits
                            .filter(function (commit) {

                                // Get rid of jenkins' release tagging commits
                                // Remove commits we've already spat out
                                return (
                                    commit.author !== 'TryGhost-Jenkins' &&
                                    !commitCache[commit.hash]
                                );
                            })
                            .map(function (commit) {
                                buffer += '\n* ' + commit.message + ' (_' + commit.author + '_)';
                                commitCache[commit.hash] = true;
                            });

                        if (!commits.length) {
                            buffer += '\nNo changes were made in this build.\n';
                        }

                        callback(buffer + '\n');
                    });
                }

                // Get two weeks' worth of tags
                tags.unshift({'tag': 'HEAD'});

                tags =
                    tags
                        .slice(0, 14)
                        .map(function (tag, index) {
                        return [
                            tag,
                            tags[index + 1] || tags[index]
                        ];
                    });

                log.write('# Ghost Changelog\n\n');
                log.write('_Showing ' + tags.length + ' releases._\n');

                when.reduce(tags,
                    function (prev, tag, idx) {
                        /*jshint unused:false*/
                        return when.promise(function (resolve) {
                            processTag(tag, function (releaseData) {
                                resolve(prev + '\n' + releaseData);
                            });
                        });
                    }, '')
                    .then(function (reducedChangelog) {
                        log.write(reducedChangelog);
                        log.close();
                        done(true);
                    });
            });
        });

        grunt.registerTask('release',
            'Release task - creates a final built zip\n' +
            ' - Do our standard build steps (handlebars, etc)\n' +
            ' - Generate changelog for the past 14 releases\n' +
            ' - Copy files to release-folder/#/#{version} directory\n' +
            ' - Clean out unnecessary files (travis, .git*, .af*, .groc*)\n' +
            ' - Zip files in release-folder to dist-folder/#{version} directory',
            [
                'shell:bower',
                'handlebars',
                'concat',
                'uglify',
                'clean:release',
                'copy:release',
                'compress:release'
            ]);

        grunt.registerTask('dev',
            'Dev Mode; watch files and restart server on changes',
            [
                'handlebars',
                'concat',
                'copy:dev',
                'express:dev',
                'watch'
            ]);

        // ### Find out more about grunt task usage

        grunt.registerTask('help',
            'Outputs help information if you type `grunt help` instead of `grunt --help`',
            function () {
                console.log('Type `grunt --help` to get the details of available grunt tasks, or alternatively visit https://github.com/TryGhost/Ghost/wiki/Grunt-Toolkit');
            });


        // ### Running the test suites

        grunt.registerTask('test-unit', 'Run unit tests (mocha)', ['clean:test', 'setTestEnv', 'loadConfig', 'mochacli:unit']);

        grunt.registerTask('test-integration', 'Run integration tests (mocha + db access)', ['clean:test', 'setTestEnv', 'loadConfig', 'mochacli:integration']);

        grunt.registerTask('test-functional', 'Run functional interface tests (CasperJS)', ['clean:test', 'setTestEnv', 'loadConfig', 'copy:dev', 'express:test', 'spawn-casperjs', 'express:test:stop']);

        grunt.registerTask('test-api', 'Run functional api tests (mocha)', ['clean:test', 'setTestEnv', 'loadConfig', 'express:test', 'mochacli:api', 'express:test:stop']);

        grunt.registerTask('test-routes', 'Run functional route tests (mocha)', ['clean:test', 'setTestEnv', 'loadConfig', 'express:test', 'mochacli:routes', 'express:test:stop']);

        grunt.registerTask('validate', 'Run tests and lint code', ['jshint', 'test-routes', 'test-unit', 'test-api', 'test-integration', 'test-functional']);


        // ### Coverage report for Unit and Integration Tests

        grunt.registerTask('test-coverage', 'Generate unit and integration (mocha) tests coverage report', ['clean:test', 'setTestEnv', 'loadConfig', 'shell:coverage']);


        // ### Documentation

        grunt.registerTask('docs', 'Generate Docs', ['groc']);


        // ### Tools for building assets

        grunt.registerTask('init', 'Prepare the project for development', ['shell:bower', 'default']);

        // Before running in production mode
        grunt.registerTask('prod', 'Build JS & templates for production', ['handlebars', 'concat', 'uglify', 'copy:prod']);

        // When you just say 'grunt'
        grunt.registerTask('default', 'Build JS & templates for development', ['update_submodules', 'handlebars', 'concat', 'copy:dev']);
    };

module.exports = configureGrunt;
