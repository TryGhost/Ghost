(function () {
    "use strict";

    var configureGrunt = function (grunt) {

        var cfg = {
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
                    ["core/**/*.js", "!**/assets/lib/**/*.js"]
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
                }
            },

            // Compile all the SASS!
            sass: {
                admin: {
                    files: {
                        'core/admin/assets/css/screen.css': 'core/admin/assets/sass/screen.scss'
                    }
                }
            },

            shell: {
                bourbon: {
                    command: 'bourbon install --path core/admin/assets/sass/modules/'
                }
            },

            handlebars: {

                core: {

                    options: {

                        namespace: "JST",

                        processName: function (filename) {
                            filename = filename.replace('./core/admin/assets/tmpl/', '');
                            return filename.replace('.hbs', '');
                        }
                    },

                    files: {
                        "./core/admin/assets/tmpl/hbs-tmpl.js": "./core/admin/assets/tmpl/**/*.hbs"
                    }

                }
            },

            watch:  {
                handlebars: {
                    files: './core/admin/assets/tmpl/**/*.hbs',
                    tasks: ['handlebars']
                }
            }

        };


        grunt.initConfig(cfg);

        grunt.loadNpmTasks("grunt-jslint");
        grunt.loadNpmTasks("grunt-mocha-test");
        grunt.loadNpmTasks("grunt-shell");

        grunt.loadNpmTasks("grunt-contrib-watch");
        grunt.loadNpmTasks("grunt-contrib-sass");
        grunt.loadNpmTasks("grunt-contrib-handlebars");


        // Prepare the project for development
        // TODO: Git submodule init/update (https://github.com/jaubourg/grunt-update-submodules)?
        grunt.registerTask("init", ["shell:bourbon", "sass:admin"]);

        // Run API tests only
        grunt.registerTask("test-api", ["mochaTest:api"]);

        // Run tests and lint code
        grunt.registerTask("validate", ["jslint", "mochaTest:all"]);

        // When you just say "grunt"
        grunt.registerTask("default", ['sass:admin', 'handlebars', 'watch']);
    };

    module.exports = configureGrunt;

}());