// ### Config for grunt-contrib-sass
// Compile all the SASS!

module.exports = {

    admin: {
        files: {
            '<%= paths.adminAssets %>/css/screen.css': '<%= paths.adminAssets %>/sass/screen.scss'
        }
    },
    compress: {
        options: {
            style: 'compressed'
        },
        files: {
            '<%= paths.adminAssets %>/css/screen.css': '<%= paths.adminAssets %>/sass/screen.scss'
        }
    }

};