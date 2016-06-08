"use strict";

var gulp = require("gulp"),
	minifycss = require("gulp-clean-css"),
	uglify = require("gulp-uglify"),
	concat = require("gulp-concat"),
	header = require("gulp-header"),
	buffer = require("vinyl-buffer"),
	pkg = require("./package.json"),
	debug = require("gulp-debug"),
	eslint = require("gulp-eslint"),
	prettify = require("gulp-jsbeautifier"),
	browserify = require("browserify"),
	source = require("vinyl-source-stream"),
	rename = require("gulp-rename");

var banner = ["/**",
	" * <%= pkg.name %> v<%= pkg.version %>",
	" * Copyright <%= pkg.company %>",
	" * @link <%= pkg.homepage %>",
	" * @license <%= pkg.license %>",
	" */",
	""].join("\n");

gulp.task("prettify-js", [], function() {
	return gulp.src("./src/js/simplemde.js")
		.pipe(prettify({js: {brace_style: "collapse", indent_char: "\t", indent_size: 1, max_preserve_newlines: 3, space_before_conditional: false}}))
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
		.pipe(eslint.format())
		.pipe(eslint.failAfterError());
});

function taskBrowserify(opts) {
	return browserify("./src/js/simplemde.js", opts)
		.bundle();
}

gulp.task("browserify:debug", ["lint"], function() {
	return taskBrowserify({debug:true, standalone:"SimpleMDE"})
		.pipe(source("simplemde.debug.js"))
		.pipe(buffer())
		.pipe(header(banner, {pkg: pkg}))
		.pipe(gulp.dest("./debug/"));
});

gulp.task("browserify", ["lint"], function() {
	return taskBrowserify({standalone:"SimpleMDE"})
		.pipe(source("simplemde.js"))
		.pipe(buffer())
		.pipe(header(banner, {pkg: pkg}))
		.pipe(gulp.dest("./debug/"));
});

gulp.task("scripts", ["browserify:debug", "browserify", "lint"], function() {
	var js_files = ["./debug/simplemde.js"];
	
	return gulp.src(js_files)
		.pipe(concat("simplemde.min.js"))
		.pipe(uglify())
		.pipe(buffer())
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
		.pipe(buffer())
		.pipe(header(banner, {pkg: pkg}))
		.pipe(gulp.dest("./debug/"))
		.pipe(minifycss())
		.pipe(rename("simplemde.min.css"))
		.pipe(buffer())
		.pipe(header(banner, {pkg: pkg}))
		.pipe(gulp.dest("./dist/"));
});

gulp.task("default", ["scripts", "styles"]);
