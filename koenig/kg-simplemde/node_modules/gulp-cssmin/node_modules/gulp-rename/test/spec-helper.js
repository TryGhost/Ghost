"use strict";

require("should");
require("mocha");

var Path = require("path"),
	gulp = require("gulp"),
	rename = require("../");

global.helper = function (srcArgs, obj, expectedPath, done) {
	var srcPattern = srcArgs.pattern || srcArgs;
	var srcOptions = srcArgs.options || {};
	var stream = gulp.src(srcPattern, srcOptions).pipe(rename(obj));
	var count = 0;
	stream.on("error", done);
	stream.on("data", function () {
		count++;
	});
	if (expectedPath) {
		stream.on("data", function (file) {
			var resolvedExpectedPath = Path.resolve(expectedPath);
			var resolvedActualPath = Path.join(file.base, file.relative);
			resolvedActualPath.should.equal(resolvedExpectedPath);
		});
	}
	stream.on("end", function () {
		count.should.be.greaterThan(0);
		done.apply(this, arguments);
	});
};

global.helperError = function (srcPattern, obj, expectedError, done) {
	var stream = gulp.src(srcPattern).pipe(rename(obj));
	stream.on("error", function (err) {
		err.message.should.equal(expectedError);
		done();
	});
	stream.on("data", function () {});
	stream.on("end", done);
};
