/*
 Gruntfile - Task automation for Ghost
 Run various tasks when developing for and working with Ghost
 Run `grunt --help` or visit https://github.com/TryGhost/Ghost/wiki/Grunt-Toolkit/ for usage instructions
 */
var path           = require('path'),
    buildDirectory = path.resolve(process.cwd(), '.build'),
    distDirectory  = path.resolve(process.cwd(), '.dist'),
    bootstrap      = require('./core/bootstrap'),

    configureGrunt = function (grunt) {

      // load grunt config
      require('load-grunt-config')(grunt, {
          configPath: path.join(process.cwd(), 'grunt'),
          init: true,
          config: {
              // Common paths to be used by tasks
              paths: {
                  adminAssets: './core/client/assets',
                  build: buildDirectory,
                  releaseBuild: path.join(buildDirectory, 'release'),
                  dist: distDirectory,
                  releaseDist: path.join(distDirectory, 'release')
              },
              buildType: 'Build'
          },
          loadGruntTasks: {
              pattern: 'grunt-*',
              config: require('./package.json'),
              scope: 'devDependencies'
          }
      });

      // ## Custom Tasks

      grunt.registerTask('setTestEnv', 'Use "testing" Ghost config; unless we are running on travis (then show queries for debugging)', function () {
          process.env.NODE_ENV = process.env.TRAVIS ? 'travis-' + process.env.DB : 'testing';
          grunt.config.get('express').test.options.node_env = process.env.NODE_ENV;
      });

      grunt.registerTask('loadConfig', function () {
          var done = this.async();
          bootstrap().then(function () {
              done();
          });
      });

      grunt.registerTask('release',
        'Release task - creates a final built zip\n' +
          ' - Do our standard build steps (sass, handlebars, etc)\n' +
          ' - Generate changelog for the past 14 releases\n' +
          ' - Copy files to release-folder/#/#{version} directory\n' +
          ' - Clean out unnecessary files (travis, .git*, .af*, .groc*)\n' +
          ' - Zip files in release-folder to dist-folder/#{version} directory',
        [
            'shell:bourbon',
            'sass:compress',
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
            'sass:admin',
            'handlebars',
            'concat',
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

      grunt.registerTask('test-functional', 'Run functional interface tests (CasperJS)', ['clean:test', 'setTestEnv', 'loadConfig', 'express:test', 'spawn-casperjs', 'express:test:stop']);

      grunt.registerTask('test-api', 'Run functional api tests (mocha)', ['clean:test', 'setTestEnv', 'loadConfig', 'express:test', 'mochacli:api', 'express:test:stop']);

      grunt.registerTask('test-routes', 'Run functional route tests (mocha)', ['clean:test', 'setTestEnv', 'loadConfig', 'express:test', 'mochacli:routes', 'express:test:stop']);

      grunt.registerTask('validate', 'Run tests and lint code', ['jslint', 'test-routes', 'test-unit', 'test-api', 'test-integration', 'test-functional']);


      // ### Coverage report for Unit and Integration Tests

      grunt.registerTask('test-coverage', 'Generate unit and integration (mocha) tests coverage report', ['clean:test', 'setTestEnv', 'loadConfig', 'shell:coverage']);


      // ### Documentation

      grunt.registerTask('docs', 'Generate Docs', ['groc']);

      // ### Tools for building assets

      grunt.registerTask('init', 'Prepare the project for development', ['shell:bundle', 'shell:bourbon', 'default']);

      // Before running in production mode
      grunt.registerTask('prod', 'Build CSS, JS & templates for production', ['sass:compress', 'handlebars', 'concat', 'uglify']);

      // When you just say 'grunt'
      grunt.registerTask('default', 'Build CSS, JS & templates for development', ['update_submodules', 'sass:compress', 'handlebars', 'concat']);

  };

module.exports = configureGrunt;