(function () {
    "use strict";

    var path = require('path'),
        buildDirectory = path.resolve(process.cwd(), '../build'),
        distDirectory =  path.resolve(process.cwd(), '../dist'),
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
                jslint: {
                    directives: {
                        node: true,
                        browser: true,
                        nomen: true,
                        todo: true,
                        unparam: true
                    },
                    files: [
                        // Lint files in the root, including Gruntfile.js
                        "*.js",
                        // Lint core files, but not libs
                        ["core/**/*.js", "!**/assets/lib/**/*.js", "!**/assets/tpl/*.js"]
                    ]
                },

                mochaTest: {
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
                }
            };

            grunt.initConfig(cfg);

            grunt.loadNpmTasks("grunt-jslint");
            grunt.loadNpmTasks("grunt-mocha-test");
            grunt.loadNpmTasks("grunt-shell");
            grunt.loadNpmTasks("grunt-bump");

            grunt.loadNpmTasks("grunt-contrib-compress");
            grunt.loadNpmTasks("grunt-contrib-copy");
            grunt.loadNpmTasks("grunt-contrib-watch");
            grunt.loadNpmTasks("grunt-contrib-sass");
            grunt.loadNpmTasks("grunt-contrib-handlebars");

            // Update the package information after changes
            grunt.registerTask('updateCurrentPackageInfo', function () {
                cfg.pkg = grunt.file.readJSON('package.json');
            });

            // Prepare the project for development
            // TODO: Git submodule init/update (https://github.com/jaubourg/grunt-update-submodules)?
            grunt.registerTask("init", ["shell:bourbon", "sass:admin", 'handlebars']);

            // Run API tests only
            grunt.registerTask("test-api", ["mochaTest:api"]);

            // Run permisisons tests only
            grunt.registerTask("test-p", ["mochaTest:perm"]);

            // Run tests and lint code
            grunt.registerTask("validate", ["jslint", "mochaTest:all"]);

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
                "validate",
                "bump",
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

}());