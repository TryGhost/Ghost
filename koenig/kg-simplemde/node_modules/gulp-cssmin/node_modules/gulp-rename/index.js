var map = require("map-stream"),
	Path = require("path");

module.exports = function (obj) {
	"use strict";

	function parsePath(path) {
		var extname = Path.extname(path);
		return {
			dirname: Path.dirname(path),
			basename: Path.basename(path, extname),
			extname: extname
		};
	}

	function rename(file, callback) {

		var parsedPath = parsePath(file.relative);
		var path;

		var type = typeof obj;

		if (type === "string" && obj !== "") {

			path = obj;

		} else if (type === "function") {

			var result = obj(parsedPath) || parsedPath;
			path = Path.join(result.dirname, result.basename + result.extname);

		} else if (type === "object" && obj !== undefined && obj !== null) {

			var dirname = 'dirname' in obj ? obj.dirname : parsedPath.dirname,
				prefix = obj.prefix || "",
				suffix = obj.suffix || "",
				basename = 'basename' in obj ? obj.basename : parsedPath.basename,
				extname = 'extname' in obj ? obj.extname : parsedPath.extname;

			path = Path.join(dirname, prefix + basename + suffix + extname);

		} else {
			callback(new Error("Unsupported renaming parameter type supplied"), undefined);
			return;
		}

		file.path = Path.join(file.base, path);

		callback(null, file);
	}

	return map(rename);
};
