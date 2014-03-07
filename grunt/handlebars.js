// ### Config for grunt-contrib-handlebars
// Compile templates for admin client

module.exports = {

    core: {
        options: {
            namespace: 'JST',
            processName: function (filename) {
                filename = filename.replace('core/client/tpl/', '');
                return filename.replace('.hbs', '');
            }
        },
        files: {
            'core/client/tpl/hbs-tpl.js': 'core/client/tpl/**/*.hbs'
        }
    }

};