module.exports = (grunt) ->

  grunt.initConfig

    dirs:
      coffeeDir: 'coffeescripts'
      jsDir: 'bin/javascripts'
      cssDir: 'bin/css'
      testDir: 'tests'

    pkg: grunt.file.readJSON('nanoscroller.jquery.json')

    banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
      '<%= grunt.template.today("yyyy") %>\n' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n'

    concat:
      options:
        banner: '<%= banner %>',
        stripBanners: true
      dist:
        src: ['<%= dirs.jsDir %>/<%= pkg.name %>.js']
        dest: '<%= dirs.jsDir %>/<%= pkg.name %>.js'

    uglify:
      options:
        sourceMapIn: '<%= dirs.jsDir %>/<%= pkg.name %>.js.map'
        sourceMap: '<%= dirs.jsDir %>/<%= pkg.name %>.min.js.map'
        sourceMappingURL: '<%= pkg.name %>.min.js.map'
        banner:  '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                 '(c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                 ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n'
      build:
        src: '<%= dirs.jsDir %>/<%= pkg.name %>.js'
        dest: '<%= dirs.jsDir %>/<%= pkg.name %>.min.js'

    sizediff:
      all:
        src:
          ['<%= dirs.jsDir %>/<%= pkg.name %>.js', '<%= dirs.jsDir %>/<%= pkg.name %>.min.js']

    coffee:
      nano:
        options:
          bare: true
          sourceMap: true
        files:
          '<%= dirs.jsDir %>/<%= pkg.name %>.js': ['<%= dirs.coffeeDir %>/*.coffee']
      tests:
        files:
          '<%= dirs.testDir %>/spec/nano-spec.js': ['<%= dirs.testDir %>/coffeescripts/*.coffee']

    jasmine:
      src: '<%= dirs.jsDir %>/<%= pkg.name %>.min.js'
      options:
        keepRunner: false
        vendor: ['<%= dirs.testDir %>/lib/jquery.min.js', '<%= dirs.testDir %>/lib/jasmine-jquery.js']
        specs: '<%= dirs.testDir %>/spec/**/*.js'

    shell:
      marked:
        command: 'node_modules/marked/bin/marked README.md > bin/readme.html'
        options:
          stdout: true

    yuidoc:
      compile:
        name: '<%= pkg.name %>'
        description: '<%= pkg.description %>'
        version: '<%= pkg.version %>'
        url: '<%= pkg.homepage %>'
        options:
          paths: 'bin/javascripts'
          outdir: 'docs/'

    csslint:
      options:
        csslintrc: '.csslintrc'
      src: ['<%= dirs.cssDir %>/nanoscroller.css']

    connect:
      server:
        options:
          port: 8888

    watch:
      src:
        files: '<%= dirs.coffeeDir %>/*.coffee'
        tasks: ['default']

  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-sizediff'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-shell'
  grunt.loadNpmTasks 'grunt-contrib-yuidoc'
  grunt.loadNpmTasks 'grunt-contrib-jasmine'
  grunt.loadNpmTasks 'grunt-contrib-csslint'
  grunt.loadNpmTasks 'grunt-contrib-connect'

  grunt.registerTask 'default', ['coffee:nano', 'concat', 'uglify','csslint',  'sizediff', 'shell:marked']
  grunt.registerTask 'build', ['default']
  grunt.registerTask 'build:docs', ['yuidoc']
  grunt.registerTask 'build:tests', ['coffee:tests']
  grunt.registerTask 'test', ['coffee:tests', 'jasmine']
  grunt.registerTask 'size', ['sizediff']
  grunt.registerTask 'server', ['default', 'connect:server', 'watch']
