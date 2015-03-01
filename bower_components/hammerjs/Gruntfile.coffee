module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'

    meta:
      banner: '
/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n
 * <%= pkg.homepage %>\n
 *\n
 * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %> <<%= pkg.author.email %>>;\n
 * Licensed under the <%= _.pluck(pkg.licenses, "type").join(", ") %> license */\n\n'

    concat:
      options:
        separator: '\n\n'
      dist:
        options:
          banner: '<%= meta.banner %>'
        src: [
          'src/hammer.prefix'
          'src/setup.js'
          'src/utils.js'
          'src/instance.js'
          'src/event.js'
          'src/pointerevent.js'
          'src/detection.js'
          'src/gestures/*.js'
          'src/export.js'
          'src/hammer.suffix']
        dest: 'hammer.js'

    uglify:
      options:
        report: 'gzip'
        sourceMap: 'hammer.min.map'
        banner: '<%= meta.banner %>'
      dist:
        files:
          'hammer.min.js': ['hammer.js']

    'string-replace':
      version:
        files:
          'hammer.js': 'hammer.js'
        options:
          replacements: [
              pattern: '{{PKG_VERSION}}'
              replacement: '<%= pkg.version %>'
            ]

    jshint:
      options:
        jshintrc: true
      dist:
        src: ['hammer.js']

    watch:
      scripts:
        files: ['src/**/*.js']
        tasks: ['concat','string-replace','uglify']
        options:
          interrupt: true

    connect:
      server:
        options:
          hostname: "0.0.0.0"
          port: 8000

    qunit:
      all: ['tests/**/*.html']

  # Load tasks
  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-contrib-connect'
  grunt.loadNpmTasks 'grunt-contrib-qunit'
  grunt.loadNpmTasks 'grunt-string-replace'

  # Default task(s).
  grunt.registerTask 'default', ['connect','watch']
  grunt.registerTask 'build', ['concat','string-replace','uglify','test']
  grunt.registerTask 'test', ['jshint','qunit']
  grunt.registerTask 'test-travis', ['build']
