'use strict';
var osHomedir = require('os-homedir');
var home = osHomedir();

module.exports = function (str) {
	return str.replace(home, '~');
};
