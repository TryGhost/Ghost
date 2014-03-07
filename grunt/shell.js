// command line tools
// ### config for grunt-shell

module.exports = {

    // run bundle
    bundle: {
        command: 'bundle install'
    },
    // install bourbon
    bourbon: {
        command: 'bourbon install --path <%= paths.adminAssets %>/sass/modules/'
    },
    // generate coverage report
    coverage: {
        command: function () {
            // will work on windows only if mocha is globally installed
            var cmd = !!process.platform.match(/^win/) ? 'mocha' : './node_modules/mocha/bin/mocha';
            return cmd + ' --timeout 15000 --reporter html-cov > coverage.html ./core/test/blanket_coverage.js';
        },
        execOptions: {
        env: 'NODE_ENV=' + process.env.NODE_ENV
        }
    }

};