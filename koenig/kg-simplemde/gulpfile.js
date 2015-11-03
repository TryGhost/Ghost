"use strict";
var gulp = require("gulp"),
	minifycss = require("gulp-minify-css"),
	uglify = require("gulp-uglify"),
	concat = require("gulp-concat"),
	header = require("gulp-header"),
	pkg = require("./package.json"),
	debug = require("gulp-debug"),
	eslint = require("gulp-eslint"),
	prettify = require("gulp-jsbeautifier");
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var rename = require("gulp-rename");


var banner = ["/**",
	" * <%= pkg.name %> v<%= pkg.version %>",
	" * Copyright <%= pkg.company %>",
	" * @link <%= pkg.homepage %>",
	" * @license <%= pkg.license %>",
	" */",
	""].join("\n");

gulp.task("prettify-js", [], function() {
	return gulp.src("./src/js/simplemde.js")
		.pipe(prettify({js: {braceStyle: "collapse", indentChar: "\t", indentSize: 1, maxPreserveNewlines: 3, spaceBeforeConditional: false}}))
		.pipe(gulp.dest("./src/js"));
});
 
gulp.task("prettify-css", [], function() {
	return gulp.src("./src/css/simplemde.css")
		.pipe(prettify({css: {indentChar: "\t", indentSize: 1}}))
		.pipe(gulp.dest("./src/css"));
});

gulp.task("lint", ["prettify-js"], function() {
	gulp.src("./src/js/**/*.js")
		.pipe(debug())
		.pipe(eslint())
		.pipe(eslint.format());
});

function taskBrowserify(opts) {
	return browserify("./src/js/simplemde.js", opts)
		.bundle();

}

gulp.task("browserify:dev", ["lint"], function() {
	return taskBrowserify({debug:true, standalone:"SimpleMDE"})
		.pipe(source("simplemde.debug.js"))
		.pipe(header(banner, {pkg: pkg}))
		.pipe(gulp.dest("./debug/"));
});

gulp.task("browserify:min", ["lint"], function() {
	return taskBrowserify({standalone:"SimpleMDE"})
		.pipe(source("simplemde.js"))
		.pipe(header(banner, {pkg: pkg}))
		.pipe(gulp.dest("./debug/"));
});

gulp.task("scripts", ["browserify:dev", "browserify:min", "lint"], function() {
	var js_files = ["./debug/simplemde.js"];
	
	return gulp.src(js_files)
		.pipe(concat("simplemde.min.js"))
		.pipe(uglify())
		.pipe(header(banner, {pkg: pkg}))
		.pipe(gulp.dest("./dist/"));
});

gulp.task("styles", ["prettify-css"], function() {
	var css_files = [
		"./node_modules/codemirror/lib/codemirror.css",
		"./src/css/*.css",
		"./node_modules/codemirror-spell-checker/src/css/spell-checker.css"
	];
	
	return gulp.src(css_files)
		.pipe(concat("simplemde.css"))
		.pipe(header(banner, {pkg: pkg}))
		.pipe(gulp.dest("./debug/"))
		.pipe(minifycss())
		.pipe(rename("simplemde.min.css"))
		.pipe(header(banner, {pkg: pkg}))
		.pipe(gulp.dest("./dist/"));
});

gulp.task("default", ["scripts", "styles"]);