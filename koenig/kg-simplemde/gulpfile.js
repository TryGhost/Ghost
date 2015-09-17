var gulp = require("gulp"),
	minifycss = require("gulp-minify-css"),
	uglify = require("gulp-uglify"),
	concat = require("gulp-concat"),
	header = require("gulp-header"),
	pkg = require("./package.json"),
	prettify = require("gulp-jsbeautifier"),
	download = require("gulp-download");

var banner = ["/**",
	" * <%= pkg.name %> v<%= pkg.version %>",
	" * Copyright <%= pkg.company %>",
	" * @link <%= pkg.homepage %>",
	" * @license <%= pkg.license %>",
	" */",
	""].join("\n");

gulp.task("downloads-codemirror", function(callback) {
	var download_urls = [
		"https://raw.githubusercontent.com/codemirror/CodeMirror/master/lib/codemirror.js",
		"https://raw.githubusercontent.com/codemirror/CodeMirror/master/addon/edit/continuelist.js",
		//"https://raw.githubusercontent.com/codemirror/CodeMirror/master/addon/edit/tablist.js", //waiting for PRs
		"https://raw.githubusercontent.com/codemirror/CodeMirror/master/addon/display/fullscreen.js",
		"https://raw.githubusercontent.com/codemirror/CodeMirror/master/addon/mode/overlay.js",
		//"https://raw.githubusercontent.com/codemirror/CodeMirror/master/mode/gfm/gfm.js", //waiting for PRs
		"https://raw.githubusercontent.com/codemirror/CodeMirror/master/mode/markdown/markdown.js",
		"https://raw.githubusercontent.com/codemirror/CodeMirror/master/mode/xml/xml.js"];
	
	download(download_urls)
		.pipe(gulp.dest("src/js/codemirror/"));
	
	// Wait to make sure they've been downloaded
	setTimeout(function() {
		callback();
	}, 5000);
});

gulp.task("downloads-js", function(callback) {
	var download_urls = [
		"https://raw.githubusercontent.com/chjj/marked/master/lib/marked.js",
		"https://raw.githubusercontent.com/NextStepWebs/codemirror-spell-checker/master/src/js/spell-checker.js",
		"https://raw.githubusercontent.com/NextStepWebs/codemirror-spell-checker/master/src/js/typo.js"];
	
	download(download_urls)
		.pipe(gulp.dest("src/js/"));
	
	// Wait to make sure they've been downloaded
	setTimeout(function() {
		callback();
	}, 5000);
});

gulp.task("downloads-css", function(callback) {
	var download_urls = [
		"https://raw.githubusercontent.com/codemirror/CodeMirror/master/lib/codemirror.css",
		"https://raw.githubusercontent.com/NextStepWebs/codemirror-spell-checker/master/src/css/spell-checker.css"];
	
	download(download_urls)
		.pipe(gulp.dest("src/css/"));
	
	// Wait to make sure they've been downloaded
	setTimeout(function() {
		callback();
	}, 5000);
});

gulp.task("scripts", ["downloads-codemirror", "downloads-js", "downloads-css"], function() {
	var js_files = [
		"./src/js/codemirror/codemirror.js",
		"./src/js/codemirror/continuelist.js",
		"./src/js/codemirror/tablist.js",
		"./src/js/codemirror/fullscreen.js",
		"./src/js/codemirror/markdown.js",
		"./src/js/codemirror/overlay.js",
		"./src/js/codemirror/gfm.js",
		"./src/js/codemirror/xml.js",
		"./src/js/typo.js",
		"./src/js/spell-checker.js",
		"./src/js/marked.js",
		"./src/js/simplemde.js"];

	return gulp.src(js_files)
		.pipe(header(banner, {pkg: pkg}))
		.pipe(concat("simplemde.min.js"))
		.pipe(gulp.dest("dist"))
		.pipe(uglify())
		.pipe(header(banner, {pkg: pkg}))
		.pipe(gulp.dest("dist"));
});

gulp.task("styles", ["downloads-codemirror", "downloads-js", "downloads-css"], function() {
	return gulp.src("./src/css/*.css")
		.pipe(concat("simplemde.min.css"))
		.pipe(gulp.dest("dist"))
		.pipe(minifycss())
		.pipe(header(banner, {pkg: pkg}))
		.pipe(gulp.dest("dist"));
});
 
gulp.task("prettify-js", function() {
	gulp.src("./src/js/simplemde.js")
		.pipe(prettify({js: {braceStyle: "collapse", indentChar: "\t", indentSize: 1, maxPreserveNewlines: 3, spaceBeforeConditional: false}}))
		.pipe(gulp.dest("./src/js"));
});
 
gulp.task("prettify-css", function() {
	gulp.src("./src/css/simplemde.css")
		.pipe(prettify({css: {indentChar: "\t", indentSize: 1}}))
		.pipe(gulp.dest("./src/css"));
});

gulp.task("default", ["downloads-codemirror", "downloads-js", "downloads-css", "scripts", "styles", "prettify-js", "prettify-css"]);