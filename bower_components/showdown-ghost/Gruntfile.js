
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      src: {
        src: ['src/**/*.js']
      },
      test: {
        src: ['test/**/*.js']
      },
      options: {
        browser: true
      }
    },
    simplemocha: {
      all: {
        src: 'test/run.js',
        options: {
          globals: ['should'],
          timeout: 3000,
          ignoreLeaks: false,
          ui: 'bdd'
        }
      }
    }
  });
  
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-simple-mocha');

  grunt.registerTask('test', ['simplemocha', 'jshint']);
};
