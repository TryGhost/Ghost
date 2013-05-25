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

            // Unit test all the things!
            nodeunit: {
                all: ['core/test/ghost/**/test-*.js'],
                api: ['core/test/ghost/test-api.js']
            },

            mochaTest: {
                options: {
                    ui: "bdd",
                    reporter: "spec"
                },

                all: {
                    src: ['core/test/**/*_spec.js']
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
            }
        };

        grunt.initConfig(cfg);

        grunt.loadNpmTasks("grunt-jslint");
        grunt.loadNpmTasks("grunt-contrib-nodeunit");
        grunt.loadNpmTasks("grunt-mocha-test");
        grunt.loadNpmTasks("grunt-contrib-sass");
        grunt.loadNpmTasks("grunt-shell");

        // Prepare the project for development
        // TODO: Git submodule init/update (https://github.com/jaubourg/grunt-update-submodules)?
        grunt.registerTask("init", ["shell:bourbon", "sass:admin"]);

        // Run API tests only
        grunt.registerTask("test-api", ["nodeunit:api", "mochaTest:all"]);

        // Run tests and lint code
        grunt.registerTask("validate", ["jslint", "mochaTest:all"]);
    };

    module.exports = configureGrunt;

}());