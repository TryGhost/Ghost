'use strict';
var fs = require('graceful-fs');
var tempfile = require('tempfile');

module.exports = function (str, ext, cb) {
	if (typeof ext === 'function') {
		cb = ext;
		ext = null;
	}

	var filePath = tempfile(ext);

	fs.writeFile(filePath, str, function (err) {
		cb(err, filePath);
	});
};

module.exports.sync = function (str, ext) {
	var filePath = tempfile(ext);
	fs.writeFileSync(filePath, str);
	return filePath;
};
