/*global describe, context, it, beforeEach, helper, helperError */
"use strict";

require("./spec-helper");

describe("gulp-rename", function () {
	context("with string parameter", function () {
		context("when src pattern does not contain directory glob", function () {
			it("sets filename to value", function (done) {
				var srcPattern = "test/fixtures/hello.txt";
				var obj = "hola.md";
				var expectedPath = "test/fixtures/hola.md";
				helper(srcPattern, obj, expectedPath, done);
			});
		});
		context("when src pattern contains directory glob", function () {
			it("sets relative path to value", function (done) {
				var srcPattern = "test/**/hello.txt";
				var obj = "fixtures/hola.md";
				var expectedPath = "test/fixtures/hola.md";
				helper(srcPattern, obj, expectedPath, done);
			});
		});
	});

	context("with object parameter", function () {
		var srcPattern;
		beforeEach(function () {
			srcPattern = "test/**/hello.txt";
		});

		context("with empty object", function () {
			it("has no effect", function (done) {
				var obj = {};
				var expectedPath = "test/fixtures/hello.txt";
				helper(srcPattern, obj, expectedPath, done);
			});
		});

		context("with dirname value", function () {
			it("replaces dirname with value", function (done) {
				var obj = {
					dirname: "elsewhere",
				};
				var expectedPath = "test/elsewhere/hello.txt";
				helper(srcPattern, obj, expectedPath, done);
			});
			it("removes dirname with './'", function (done) {
				var obj = {
					dirname: "./",
				};
				var expectedPath = "test/hello.txt";
				helper(srcPattern, obj, expectedPath, done);
			});
			it("removes dirname with empty string", function (done) {
				var obj = {
					dirname: "",
				};
				var expectedPath = "test/hello.txt";
				helper(srcPattern, obj, expectedPath, done);
			});
		});

		context("with prefix value", function () {
			it("prepends value to basename", function (done) {
				var obj = {
					prefix: "bonjour-",
				};
				var expectedPath = "test/fixtures/bonjour-hello.txt";
				helper(srcPattern, obj, expectedPath, done);
			});
		});

		context("with basename value", function () {
			it("replaces basename with value", function (done) {
				var obj = {
					basename: "aloha",
				};
				var expectedPath = "test/fixtures/aloha.txt";
				helper(srcPattern, obj, expectedPath, done);
			});
			it("removes basename with empty string (for consistency)", function (done) {
				var obj = {
					prefix: "aloha",
					basename: "",
				};
				var expectedPath = "test/fixtures/aloha.txt";
				helper(srcPattern, obj, expectedPath, done);
			});
		});

		context("with suffix value", function () {
			it("appends value to basename", function (done) {
				var obj = {
					suffix: "-hola",
				};
				var expectedPath = "test/fixtures/hello-hola.txt";
				helper(srcPattern, obj, expectedPath, done);
			});
		});

		context("with extname value", function () {
			it("replaces extname with value", function (done) {
				var obj = {
					extname: ".md",
				};
				var expectedPath = "test/fixtures/hello.md";
				helper(srcPattern, obj, expectedPath, done);
			});
			it("removes extname with empty string", function (done) {
				var obj = {
					extname: "",
				};
				var expectedPath = "test/fixtures/hello";
				helper(srcPattern, obj, expectedPath, done);
			});
		});
	});

	context("with function parameter", function () {
		var srcPattern;
		beforeEach(function () {
			srcPattern = "test/**/hello.txt";
		});

		it("receives object with dirname", function (done) {
			var obj = function (path) {
				path.dirname.should.equal("fixtures");
				path.dirname = "elsewhere";
			};
			var expectedPath = "test/elsewhere/hello.txt";
			helper(srcPattern, obj, expectedPath, done);
		});

		it("receives object with basename", function (done) {
			var obj = function (path) {
				path.basename.should.equal("hello");
				path.basename = "aloha";
			};
			var expectedPath = "test/fixtures/aloha.txt";
			helper(srcPattern, obj, expectedPath, done);
		});

		it("receives object with extname", function (done) {
			var obj = function (path) {
				path.extname.should.equal(".txt");
				path.extname = ".md";
			};
			var expectedPath = "test/fixtures/hello.md";
			helper(srcPattern, obj, expectedPath, done);
		});

		it("can return a whole new object", function (done) {
			var obj = function (/*path*/) {
				return {
					dirname: "elsewhere",
					basename: "aloha",
					extname: ".md"
				};
			};
			var expectedPath = "test/elsewhere/aloha.md";
			helper(srcPattern, obj, expectedPath, done);
		});
	});

	context("throws unsupported parameter type", function () {
		var srcPattern;
		beforeEach(function () {
			srcPattern = "test/**/hello.txt";
		});

		var UNSUPPORTED_PARAMATER = "Unsupported renaming parameter type supplied";
		it("with undefined object", function (done) {
			var obj;
			var expectedError = UNSUPPORTED_PARAMATER;
			helperError(srcPattern, obj, expectedError, done);
		});

		it("with null object", function (done) {
			var obj = null;
			var expectedError = UNSUPPORTED_PARAMATER;
			helperError(srcPattern, obj, expectedError, done);
		});

		it("with empty string", function (done) {
			var obj = "";
			var expectedError = UNSUPPORTED_PARAMATER;
			helperError(srcPattern, obj, expectedError, done);
		});

		it("with boolean value", function (done) {
			var obj = true;
			var expectedError = UNSUPPORTED_PARAMATER;
			helperError(srcPattern, obj, expectedError, done);
		});

		it("with numeric value", function (done) {
			var obj = 1;
			var expectedError = UNSUPPORTED_PARAMATER;
			helperError(srcPattern, obj, expectedError, done);
		});
	});
});
