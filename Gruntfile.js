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
                    todo: true
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
                all: ['core/test/ghost/**/test-*.js']
            },

            // Compile all the SASS!
            compass: {
                options: {
                    config: "config.rb"
                },
                // No need for config, but separated for future options
                admin: {}
            }
        };

        grunt.initConfig(cfg);

        grunt.loadNpmTasks("grunt-jslint");
        grunt.loadNpmTasks("grunt-contrib-nodeunit");
        grunt.loadNpmTasks("grunt-contrib-compass");

        // Prepare the project for development
        // TODO: Git submodule init/update (https://github.com/jaubourg/grunt-update-submodules)?
        grunt.registerTask("init", ["compass:admin"]);

        // Run tests and lint code
        grunt.registerTask("validate", ["jslint", "nodeunit:all"]);
    };

    module.exports = configureGrunt;

}());