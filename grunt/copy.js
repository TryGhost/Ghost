var fs = require('fs');

// ## Build File Patterns
// a list of files and paterns to process and exclude when running builds & releases
// It is taken from the .npmignore file and all patterns are inverted as the .npmignore
// file defines what to ignore, whereas we want to define what to include.
buildGlob = (function () {
    /*jslint stupid:true */
    return fs.readFileSync('.npmignore', {encoding: 'utf8'}).split('\n').map(function (pattern) {
        if (pattern[0] === '!') {
            return pattern.substr(1);
        }
        return '!' + pattern;
    });
}());

// ### Config for grunt-contrib-copy
// Prepare files for builds / releases

module.exports = {

    release: {
        files: [{
            expand: true,
            src: buildGlob,
            dest: '<%= paths.releaseBuild %>/'
        }]
    }

};