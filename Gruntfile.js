var path = require('path'),
    buildDirectory = path.resolve(process.cwd(), '.build'),
    distDirectory =  path.resolve(process.cwd(), '.dist'),
    configureGrunt = function (grunt) {

        var cfg = {
            // Common paths to be used by tasks
            paths: {
                adminAssets: './core/admin/assets',
                build: buildDirectory,
                nightlyBuild: path.join(buildDirectory, 'nightly'),
                buildBuild: path.join(buildDirectory, 'build'),
                dist: distDirectory,
                nightlyDist: path.join(distDirectory, 'nightly'),
                buildDist: path.join(distDirectory, 'build')
            },

            pkg: grunt.file.readJSON('package.json'),

            // JSLint all the things!
            jslintm: {
                node: {
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
                            "core/**/*.js"
                        ]
                    },
                    // Lint core files, but not libs, frontend or hbs files
                    exclude: [
                        "**/assets/lib/**/*.js",
                        "**/assets/js/**/*.js",
                        "**/assets/tpl/*.js"
                    ]
                },
                frontend: {
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
                        src: "**/assets/js/**/*.js"
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
                },

                commitNightly: {
                    command: 'git commit package.json -m "Nightly build <%= pkg.version %>"'
                },

                tagNightly: {
                    command: 'git tag <%= pkg.version %> -a -m "Nightly build <%= pkg.version %>"'
                },

                pushMaster: {
                    command: 'git push origin master'
                },

                pushMasterTags: {
                    command: 'git push origin master --tags'
                }
            },

            handlebars: {
                core: {
                    options: {
                        namespace: "JST",
                        processName: function (filename) {
                            filename = filename.replace('./core/admin/assets/tpl/', '');
                            return filename.replace('.hbs', '');
                        }
                    },
                    files: {
                        "<%= paths.adminAssets %>/tpl/hbs-tpl.js": "<%= paths.adminAssets %>/tpl/**/*.hbs"
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
                            "core/admin/assets/js/*.js",
                            "core/admin/assets/js/**/*.js",
                            "core/admin/controllers/*.js",
                            "core/frontend/**/*.js",
                            "core/lang/i18n.js",
                            "core/shared/**/*.js",
                            "core/shared/*.js",
                            "core/test/**/*.js",
                            "core/test/ghost.js"
                        ]
                    }
                }
            },

            watch: {
                handlebars: {
                    files: '<%= paths.adminAssets %>/tpl/**/*.hbs',
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
                            '!core/shared/data/*.db',
                            '!.sass*',
                            '!.af*',
                            '!.git*',
                            '!.groc*',
                            '!.travis.yml'
                        ],
                        dest: "<%= paths.nightlyBuild %>/<%= pkg.version %>/"
                    }]
                },
                build: {
                    files: [{
                        expand: true,
                        src: [
                            '**',
                            '!node_modules/**',
                            '!core/shared/data/*.db',
                            '!.sass*',
                            '!.af*',
                            '!.git*',
                            '!.groc*',
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
                    push: false
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
         * - Bump patch version in package.json,
         * - Copy files to build-folder/nightly/#{version} directory
         * - Clean out unnecessary files (travis, .git*, .af*, .groc*)
         * - Zip files in build folder to dist-folder/#{version} directory
         * - git commit package.json -m "Nightly build #{version}"
         * - git tag -a -m "Nightly build #{version}"
         * - git push origin master
         * - git push origin master --tags
         * - TODO: POST to pubsubhubub to notify of new build?
         */
        grunt.registerTask("nightly", [
            "shell:bourbon",
            "sass:admin",
            "handlebars",
            "bump:build",
            "updateCurrentPackageInfo",
            "copy:nightly",
            "compress:nightly"
            /* Caution: shit gets real below here */
            //"shell:commitNightly",
            //"shell:tagNightly",
            //"shell:pushMaster",
            //"shell:pushMasterTags"
        ]);

        grunt.registerTask("build", [
            "shell:bourbon",
            "sass:admin",
            "handlebars",
            "copy:build",
            "compress:build"
        ]);

        // When you just say "grunt"
        grunt.registerTask("default", ['sass:admin', 'handlebars']);
    };

module.exports = configureGrunt;