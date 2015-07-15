"use strict";

var gulp = require("gulp"),
	fs = require("fs"),
	cp = require("child_process"),
	jshint = require("gulp-jshint");

// JSHint
// https://github.com/wearefractal/gulp-jshint
gulp.task("jshint", function () {

	//
	// FIXME
	//
	// gulp.jshint not reading .jshintrc
	// side-effect of JSHint itself not read configuration when using stdin
	//
	// https://github.com/wearefractal/gulp-jshint/issues/4
	//

	var options = JSON.parse(fs.readFileSync(".jshintrc", "utf8"));

	//
	// FIXME
	//
	// Can't use following due to Error: EMFILE, too many open files:
	//
	//	gulp.src("./**/*.js")
	//		.pipe(ignore({
	//			pattern: [
	//				"./node_modules/**",
	//				"./test/temp/**"]}))
	//
	// Must wait for core impl of .src() ignores
	//
	// https://github.com/wearefractal/gulp/issues/35
	//

	gulp.src("./*.js")
		.pipe(jshint(options))
		.pipe(jshint.reporter("default"));

	gulp.src("./test/**/*.js")
		.pipe(jshint(options))
		.pipe(jshint.reporter("default"));
});

// default task
gulp.task("default", function () {
	gulp.run("jshint");

	gulp.watch(["index.js", "./test/**"], function () {
		gulp.run("jshint");
		cp.fork("node_modules/.bin/mocha");
	});

});

