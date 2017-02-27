/* jshint node: true */

var MergeTrees = require('broccoli-merge-trees');
var Funnel = require('broccoli-funnel');
var path = require('path');
var cards = require('./addon/cards/common.js');



module.exports = {
    name: 'ghost-editor',
    treeForVendor: function () {
        var files = [];
        var MOBILEDOC_DIST_DIRECTORY = path.join(path.dirname(
            require.resolve(path.join('mobiledoc-kit', 'package.json'))), 'dist');

        files.push(new Funnel(MOBILEDOC_DIST_DIRECTORY, {
            files: [
                'amd/mobiledoc-kit.js',
                'amd/mobiledoc-kit.map'
            ],
            destDir: 'mobiledoc-kit'
        }));

        return MergeTrees(files, 'assets');

    },
    treeForPublic: function () {
         return new Funnel(__dirname + '/public/tools/', {
             destDir: 'assets/tools/'
         });
    },
    included: function (app) {
        // app.import('app/styles/globals.css');
        app.import('vendor/mobiledoc-kit/amd/mobiledoc-kit.js');
        // app.import('app/styles/ghost-editor.css');
        // app.import('app/styles/ghost-toolbar.css');
        // app.import('app/styles/ghost-toolbar-blockitem.css');
        // app.import('app/styles/slash-menu.css');

    },

    // temp
    htmlOptions:
        {
            cards: cards.html,
            atoms: [{
                name: 'soft-return',
                type: 'html',
                render: function() {
                    return "<br />";
                }
            }
            ]
        }
/*
        [
             {
                name: 'html-card',
                type: 'html',
                render: function(opts) {
                    return opts.payload.html;
                }
            }
        ]
*/
};
