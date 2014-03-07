// ### Config for grunt-contrib-watch
// Watch files and livereload in the browser during development

module.exports = {

    handlebars: {
        files: ['core/client/tpl/**/*.hbs'],
        tasks: ['handlebars']
    },
    sass: {
        files: ['<%= paths.adminAssets %>/sass/**/*'],
        tasks: ['sass:admin']
    },
    concat: {
        files: [
            'core/client/*.js',
            'core/client/helpers/*.js',
            'core/client/models/*.js',
            'core/client/tpl/*.js',
            'core/client/views/*.js'
        ],
        tasks: ['concat']
    },
    livereload: {
        files: [
            // Theme CSS
            'content/themes/casper/css/*.css',
            // Theme JS
            'content/themes/casper/js/*.js',
            // Admin CSS
            '<%= paths.adminAssets %>/css/*.css',
            // Admin JS
            'core/built/scripts/*.js'
        ],
        options: {
            livereload: true
        }
    },
    express: {
        // Restart any time client or server js files change
        files:  ['core/server.js', 'core/server/**/*.js'],
        tasks:  ['express:dev'],
        options: {
            //Without this option specified express won't be reloaded
            nospawn: true
        }
    }

};