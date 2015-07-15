'use strict';
var fs = require('fs');
var assert = require('assert');
var gutil = require('gulp-util');
var cssmin = require('./index');

it('should minify css', function (cb) {
	var stream = cssmin();
	stream.on('data', function (file) {
		assert(file.contents.length < fs.statSync(__dirname + '/sample/type.css').size);
		cb();
	});

	stream.write(new gutil.File({
		path: __dirname + '/sample/type.css',
		contents: fs.readFileSync(__dirname + '/sample/type.min.css')
	}));
});
