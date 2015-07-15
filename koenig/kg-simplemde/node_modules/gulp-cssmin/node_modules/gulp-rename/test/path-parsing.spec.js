/*global describe, context, it, helper */
"use strict";

require("./spec-helper");
var Path = require("path");

describe("gulp-rename path parsing", function () {
	describe("dirname", function () {
		context("when src pattern contains no globs", function () {
			it("dirname is '.'", function (done) {
				var srcPattern = "test/fixtures/hello.txt";
				var obj = function (path) {
					path.dirname.should.equal(".");
				};
				helper(srcPattern, obj, null, done);
			});
		});

		context("when src pattern contains filename glob", function () {
			it("dirname is '.'", function (done) {
				var srcPattern = "test/fixtures/*.min.txt";
				var obj = function (path) {
					path.dirname.should.equal(".");
				};
				helper(srcPattern, obj, null, done);
			});
		});

		var dirname_helper = function (srcPattern, expectedPath) {
			it("dirname is path from directory glob to file", function (done) {
				var obj = function (path) {
					path.dirname.should.match(/^fixtures[0-9]?$/);
				};
				helper(srcPattern, obj, null, done);
			});
		}

		context("when src pattern matches a directory with *", function () {
			dirname_helper("test/*/*.min.txt");
		});

		context("when src pattern matches a directory with **", function () {
			dirname_helper("test/**/*.min.txt");
		});

		context("when src pattern matches a directory with [...]", function () {
			dirname_helper("test/fixt[a-z]res/*.min.txt");
		});

		/* SKIP: glob2base does not handle brace expansion as expected. See wearefractal/glob2base#1 */
		context.skip("when src pattern matches a directory with {...,...}", function () {
			dirname_helper("test/f{ri,ixtur}es/*.min.txt");
		});

		/* SKIP: glob2base does not handle brace expansion as expected. See wearefractal/glob2base#1 */
		context.skip("when src pattern matches a directory with {#..#}", function () {
			dirname_helper("test/fixtures{0..9}/*.min.txt");
		});

		context("when src pattern matches a directory with an extglob", function () {
			dirname_helper("test/f+(ri|ixtur)es/*.min.txt");
		});

		/* requires glob-stream >= 3.1.0 */
		context.skip("when src pattern includes `base` option", function () {
			it("dirname is path from given directory to file", function (done) {
				var srcPattern = "test/**/*.min.txt";
				var srcOptions = {base: process.cwd()};
				var obj = function (path) {
					path.dirname.should.equal("test/fixtures");
				};
				helper({pattern: srcPattern, options: srcOptions}, obj, null, done);
			});
		});
	});

	describe("basename", function () {
		it("strips extension like Path.basename(path, ext)", function (done) {
			var srcPattern = "test/fixtures/hello.min.txt";
			var obj = function (path) {
				path.basename.should.equal("hello.min");
				path.basename.should.equal(Path.basename(srcPattern, Path.extname(srcPattern)));
			};
			helper(srcPattern, obj, null, done);
		});
	});

	describe("extname", function () {
		it("includes '.' like Path.extname", function (done) {
			var srcPattern = "test/fixtures/hello.txt";
			var obj = function (path) {
				path.extname.should.equal(".txt");
				path.extname.should.equal(Path.extname(srcPattern));
			};
			helper(srcPattern, obj, null, done);
		});

		it("excludes multiple extensions like Path.extname", function (done) {
			var srcPattern = "test/fixtures/hello.min.txt";
			var obj = function (path) {
				path.extname.should.equal(".txt");
				path.extname.should.equal(Path.extname(srcPattern));
			};
			helper(srcPattern, obj, null, done);
		});
	});
});
