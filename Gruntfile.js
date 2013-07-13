var path = require('path'),
    buildDirectory = path.resolve(process.cwd(), '.build'),
    distDirectory =  path.resolve(process.cwd(), '.dist'),
    configureGrunt = function (grunt) {

        var cfg = {
            // Common paths to be used by tasks
            paths: {
                adminAssets: './core/client/assets',
                build: buildDirectory,
                nightlyBuild: path.join(buildDirectory, 'nightly'),
                weeklyBuild: path.join(buildDirectory, 'weekly'),
                buildBuild: path.join(buildDirectory, 'build'),
                dist: distDirectory,
                nightlyDist: path.join(distDirectory, 'nightly'),
                weeklyDist: path.join(distDirectory, 'weekly'),
                buildDist: path.join(distDirectory, 'build')
            },
            buildType: 'Build',
            pkg: grunt.file.readJSON('package.json'),

            // JSLint all the things!
            jslintm: {
                server: {
                    directives: {
                        // node environment
                        node: true,
                        // browser environment
                        browser: false,
                        // allow dangling underscores in var names
                        nomen: true,
                        // allow to do statements
                        todo: true,
                        // allow unused parameters
                        unparam: true,
                        // don't require use strict pragma
                        sloppy: true
                    },
                    files: {
                        src: [
                            "*.js",
                            "core/*.js",
                            "core/server/**/*.js"
                        ]
                    }
                },
                client: {
                    directives: {
                        // node environment
                        node: false,
                        // browser environment
                        browser: true,
                        // allow dangling underscores in var names
                        nomen: true,
                        // allow to do statements
                        todo: true,
                         // allow unused parameters
                        unparam: true
                    },
                    files: {
                        src: "core/client/**/*.js"
                    },
                    exclude: [
                        "core/client/assets/**/*.js",
                        "core/client/tpl/**/*.js"
                    ]
                },
                shared: {
                    directives: {
                        // node environment
                        node: true,
                        // browser environment
                        browser: false,
                        // allow dangling underscores in var names
                        nomen: true,
                        // allow to do statements
                        todo: true,
                        // allow unused parameters
                        unparam: true,
                        // don't require use strict pragma
                        sloppy: true
                    },
                    files: {
                        src: [
                            "core/shared/**/*.js"
                        ]
                    }
                }
            },

            mochacli: {
                options: {
                    ui: "bdd",
                    reporter: "spec"
                },

                all: {
                    src: ['core/test/**/*_spec.js']
                },

                api: {
                    src: ['core/test/**/api*_spec.js']
                },

                perm: {
                    src: ['core/test/**/permissions_spec.js']
                }
            },

            // Compile all the SASS!
            sass: {
                admin: {
                    files: {
                        '<%= paths.adminAssets %>/css/screen.css': '<%= paths.adminAssets %>/sass/screen.scss'
                    }
                }
            },

            shell: {
                bourbon: {
                    command: 'bourbon install --path <%= paths.adminAssets %>/sass/modules/'
                }
            },

            handlebars: {
                core: {
                    options: {
                        namespace: "JST",
                        processName: function (filename) {
                            filename = filename.replace('core/client/tpl/', '');
                            return filename.replace('.hbs', '');
                        }
                    },
                    files: {
                        "core/client/tpl/hbs-tpl.js": "core/client/tpl/**/*.hbs"
                    }
                }
            },

            groc: {
                docs: {
                    options: {
                        "out": "./docs/",
                        "glob": [
                            "README.md",
                            "config.js",
                            "index.js",
                            "core/ghost.js",
                            "core/server/**/*.js",
                            "core/shared/**/*.js",
                            "core/client/**/*.js"
                        ],
                        "except": [
                            "!core/client/assets/**/*.js",
                            "!core/client/tpl/**/*.js"
                        ]
                    }
                }
            },

            watch: {
                handlebars: {
                    files: 'core/client/tpl/**/*.hbs',
                    tasks: ['handlebars']
                },
                sass: {
                    files: '<%= paths.adminAssets %>/sass/**/*',
                    tasks: ['sass:admin']
                }
            },

            copy: {
                nightly: {
                    files: [{
                        expand: true,
                        src: [
                            '**',
                            '!node_modules/**',
                            '!core/server/data/*.db',
                            '!.sass*',
                            '!.af*',
                            '!.git*',
                            '!.groc*',
                            '!.travis.yml'
                        ],
                        dest: "<%= paths.nightlyBuild %>/<%= pkg.version %>/"
                    }]
                },
                weekly: {
                    files: [{
                        expand: true,
                        src: [
                            '**',
                            '!node_modules/**',
                            '!core/server/data/*.db',
                            '!.sass*',
                            '!.af*',
                            '!.git*',
                            '!.groc*',
                            '!.travis.yml'
                        ],
                        dest: "<%= paths.weeklyBuild %>/<%= pkg.version %>/"
                    }]
                },
                build: {
                    files: [{
                        expand: true,
                        src: [
                            '**',
                            '!node_modules/**',
                            '!core/server/data/*.db',
                            '!.sass*',
                            '!.af*',
                            '!.git*',
                            '!.groc*',
                            '!.iml*',
                            '!.travis.yml'
                        ],
                        dest: "<%= paths.buildBuild %>/"
                    }]
                }
            },

            compress: {
                nightly: {
                    options: {
                        archive: "<%= paths.nightlyDist %>/Ghost-Nightly-<%= pkg.version %>.zip"
                    },
                    expand: true,
                    cwd: "<%= paths.nightlyBuild %>/<%= pkg.version %>/",
                    src: ["**"]
                },
                weekly: {
                    options: {
                        archive: "<%= paths.weeklyDist %>/Ghost-Weekly-<%= pkg.version %>.zip"
                    },
                    expand: true,
                    cwd: "<%= paths.weeklyBuild %>/<%= pkg.version %>/",
                    src: ["**"]
                },
                build: {
                    options: {
                        archive: "<%= paths.buildDist %>/Ghost-Build.zip"
                    },
                    expand: true,
                    cwd: "<%= paths.buildBuild %>/",
                    src: ["**"]
                }
            },

            bump: {
                options: {
                    tagName: '%VERSION%',
                    commitMessage: '<%= buildType %> Release %VERSION%',
                    tagMessage: '<%= buildType %> Release %VERSION%',
                    pushTo: "origin build"
                }
            }
        };

        grunt.initConfig(cfg);

        grunt.loadNpmTasks("grunt-jslint");
        grunt.loadNpmTasks("grunt-mocha-cli");
        grunt.loadNpmTasks("grunt-shell");
        grunt.loadNpmTasks("grunt-bump");

        grunt.loadNpmTasks("grunt-contrib-compress");
        grunt.loadNpmTasks("grunt-contrib-copy");
        grunt.loadNpmTasks("grunt-contrib-watch");
        grunt.loadNpmTasks("grunt-contrib-sass");
        grunt.loadNpmTasks("grunt-contrib-handlebars");
        grunt.loadNpmTasks('grunt-groc');

        // Update the package information after changes
        grunt.registerTask('updateCurrentPackageInfo', function () {
            cfg.pkg = grunt.file.readJSON('package.json');
        });

        grunt.registerTask('setCurrentBuildType', function (type) {
            cfg.buildType = type;
        });

        // jslintm aliased to jslint
        grunt.registerTask("jslint", ["jslintm"]);

        // Prepare the project for development
        // TODO: Git submodule init/update (https://github.com/jaubourg/grunt-update-submodules)?
        grunt.registerTask("init", ["shell:bourbon", "sass:admin", 'handlebars']);

        // Run API tests only
        grunt.registerTask("test-api", ["mochacli:api"]);

        // Run permisisons tests only
        grunt.registerTask("test-p", ["mochacli:perm"]);

        // Run tests and lint code
        grunt.registerTask("validate", ["jslint", "mochacli:all"]);

        // Generate Docs
        grunt.registerTask("docs", ["groc"]);

        /* Nightly builds
         * - Do our standard build steps (sass, handlebars, etc)
         * - Bump patch version in package.json, commit, tag and push
         * - Copy files to build-folder/#/#{version} directory
         * - Clean out unnecessary files (travis, .git*, .af*, .groc*)
         * - Zip files in build folder to dist-folder/#{version} directory
         */
        grunt.registerTask("nightly", [
            "setCurrentBuildType:Nightly",
            "shell:bourbon",
            "sass:admin",
            "handlebars",
            "bump:build",
            "updateCurrentPackageInfo",
            "copy:nightly",
            "compress:nightly"
        ]);

        grunt.registerTask("weekly", [
            "setCurrentBuildType:Weekly",
            "shell:bourbon",
            "sass:admin",
            "handlebars",
            "bump:build",
            "updateCurrentPackageInfo",
            "copy:weekly",
            "compress:weekly"
        ]);

        grunt.registerTask("build", [
            "shell:bourbon",
            "sass:admin",
            "handlebars",
            "copy:build",
            "compress:build"
        ]);

        // When you just say "grunt"
        grunt.registerTask("default", ['init']);
    };

module.exports = configureGrunt;