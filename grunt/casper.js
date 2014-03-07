var _ = require('lodash'),
    path = require('path');

module.exports = function(grunt) {

	grunt.registerTask('spawn-casperjs', function () {
		var done = this.async(),
		    options = ['host', 'noPort', 'port', 'email', 'password'],
		    args = ['test']
		        .concat(grunt.option('target') || ['admin/', 'frontend/'])
		        .concat(['--includes=base.js', '--verbose', '--log-level=debug', '--port=2369']);

		// Forward parameters from grunt to casperjs
		_.each(options, function processOption(option) {
			if (grunt.option(option)) {
		        args.push('--' + option + '=' + grunt.option(option));
		    }
		});

		grunt.util.spawn({
	        cmd: 'casperjs',
			args: args,
			opts: {
				cwd: path.resolve('core/test/functional'),
			    stdio: 'inherit'
			}
		}, function (error, result, code) {
			/*jslint unparam:true*/
			if (error) {
				grunt.fail.fatal(result.stdout);
			}
			grunt.log.writeln(result.stdout);
			done();
		});
	});

};