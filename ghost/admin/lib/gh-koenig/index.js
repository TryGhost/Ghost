/* jshint node: true */

var Funnel = require('broccoli-funnel');
var path = require('path');

module.exports = {
    name: 'gh-koenig',

    treeForPublic: function () {
         return new Funnel(__dirname + '/public/tools/', {
             destDir: 'assets/tools/'
         });
    }
};
