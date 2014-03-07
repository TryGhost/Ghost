// ### Config for grunt-contrib-uglify
// minify javascript file for production

module.exports = {
    prod: {
        files: {
            'core/built/scripts/ghost.min.js': 'core/built/scripts/ghost.js'
        }
    }
};