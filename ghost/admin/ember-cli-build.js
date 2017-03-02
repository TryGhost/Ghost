/* eslint-disable */
/* global require, module */

var EmberApp = require('ember-cli/lib/broccoli/ember-app'),
    concat = require('broccoli-concat'),
    mergeTrees = require('broccoli-merge-trees'),
    uglify = require('broccoli-uglify-js'),
    cleanCSS = require('broccoli-clean-css'),
    environment = EmberApp.env(),
    isProduction = environment === 'production',
    disabled = {enabled: false},
    assetLocation, codemirrorAssets;

assetLocation = function (fileName) {
    if (isProduction) {
        fileName = fileName.replace('.', '.min.');
    }
    return '/assets/' + fileName;
};

codemirrorAssets = function () {
    var codemirrorFiles = [
        'lib/codemirror.css',
        'theme/xq-light.css',
        'lib/codemirror.js',
        'mode/htmlmixed/htmlmixed.js',
        'mode/xml/xml.js',
        'mode/css/css.js',
        'mode/javascript/javascript.js'
    ];

    if (environment === 'test') {
        return {import: codemirrorFiles};
    }

    return {
        public: {
            include: codemirrorFiles,
            destDir: '/',
            processTree: function (tree) {
                var jsTree = concat(tree, {
                    outputFile: 'assets/codemirror/codemirror.js',
                    headerFiles: ['lib/codemirror.js'],
                    inputFiles: ['mode/**/*'],
                    sourceMapConfig: {enabled: false}
                });

                var cssTree = concat(tree, {
                    outputFile: 'assets/codemirror/codemirror.css',
                    inputFiles: ['**/*.css']
                });

                if (isProduction) {
                    jsTree = uglify(jsTree);
                    cssTree = cleanCSS(cssTree);
                }

                return mergeTrees([jsTree, cssTree]);
            }
        }
    };
};

function postcssPlugins() {
    var plugins = [{
        module: require('postcss-easy-import')
    }, {
        module: require('postcss-custom-properties')
    }, {
        module: require('postcss-color-function')
    }, {
        module: require('autoprefixer'),
        options: {
            browsers: ['last 2 versions']
        }
    }];

    if (isProduction) {
        plugins.push({
            module: require('cssnano')
        });
    }

    return plugins;
}

module.exports = function (defaults) {
    var app = new EmberApp(defaults, {
        'ember-cli-babel': {
            optional: ['es6.spec.symbols'],
            includePolyfill: true
        },
        'ember-composable-helpers': {
            only: ['toggle']
        },
        outputPaths: {
            app: {
                js: assetLocation('ghost.js'),
                css: {
                    app: assetLocation('ghost.css'),
                    'app-dark': assetLocation('ghost-dark.css')
                }
            },
            vendor: {
                js:  assetLocation('vendor.js'),
                css: assetLocation('vendor.css')
            }
        },
        postcssOptions: {
            compile: {
                enabled: true,
                plugins: postcssPlugins()
            }
        },
        fingerprint: disabled,
        nodeAssets: {
            'blueimp-md5': {
                import: ['js/md5.js']
            },
            codemirror: codemirrorAssets(),
            'jquery-deparam': {
                import: ['jquery-deparam.js']
            },
            'mobiledoc-kit': {
                import: ['dist/amd/mobiledoc-kit.js', 'dist/amd/mobiledoc-kit.map']
            },
            moment: {
                import: ['moment.js']
            },
            'moment-timezone': {
                import: ['builds/moment-timezone-with-data.js']
            },
            'password-generator': {
                import: ['lib/password-generator.js']
            }
        },
        'ember-cli-selectize': {
            theme: false
        },
        svg: {
            paths: [
                'public/assets/icons'
            ],
            optimize: {
                plugins: [
                    {removeDimensions: true},
                    {removeTitle: true},
                    {removeXMLNS: true}
                ]
            }
        }
    });

    // 'dem Scripts
    app.import('bower_components/validator-js/validator.js');
    app.import('bower_components/rangyinputs/rangyinputs-jquery-src.js');
    app.import('bower_components/showdown-ghost/src/showdown.js');
    app.import('bower_components/showdown-ghost/src/extensions/ghostgfm.js');
    app.import('bower_components/showdown-ghost/src/extensions/ghostimagepreview.js');
    app.import('bower_components/showdown-ghost/src/extensions/footnotes.js');
    app.import('bower_components/showdown-ghost/src/extensions/highlight.js');
    app.import('bower_components/keymaster/keymaster.js');
    app.import('bower_components/devicejs/lib/device.js');

    // jquery-ui partial build
    app.import('bower_components/jquery-ui/ui/core.js');
    app.import('bower_components/jquery-ui/ui/widget.js');
    app.import('bower_components/jquery-ui/ui/mouse.js');
    app.import('bower_components/jquery-ui/ui/draggable.js');
    app.import('bower_components/jquery-ui/ui/droppable.js');
    app.import('bower_components/jquery-ui/ui/sortable.js');

    app.import('bower_components/jquery-file-upload/js/jquery.fileupload.js');
    app.import('bower_components/blueimp-load-image/js/load-image.all.min.js');
    app.import('bower_components/jquery-file-upload/js/jquery.fileupload-process.js');
    app.import('bower_components/jquery-file-upload/js/jquery.fileupload-image.js');
    app.import('bower_components/google-caja/html-css-sanitizer-bundle.js');
    app.import('bower_components/jqueryui-touch-punch/jquery.ui.touch-punch.js');

    if (app.env === 'test') {
        app.import(app.bowerDirectory + '/jquery.simulate.drag-sortable/jquery.simulate.drag-sortable.js', {type: 'test'});
    }

    return app.toTree();
};
