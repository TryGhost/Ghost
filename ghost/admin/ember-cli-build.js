/* eslint-env node */
'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const concat = require('broccoli-concat');
const mergeTrees = require('broccoli-merge-trees');
const uglify = require('broccoli-uglify-sourcemap');
const CleanCSS = require('broccoli-clean-css');
const environment = EmberApp.env();
const isProduction = environment === 'production';
let assetLocation, codemirrorAssets;

assetLocation = function (fileName) {
    if (isProduction) {
        fileName = fileName.replace('.', '.min.');
    }
    return `/assets/${fileName}`;
};

codemirrorAssets = function () {
    let codemirrorFiles = [
        // 'lib/codemirror.css',
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

    let config = {};

    config.public = {
        include: codemirrorFiles,
        destDir: '/',
        processTree(tree) {
            let jsTree = concat(tree, {
                outputFile: 'assets/codemirror/codemirror.js',
                headerFiles: ['lib/codemirror.js'],
                inputFiles: ['mode/**/*'],
                sourceMapConfig: {enabled: false}
            });

            let cssTree = concat(tree, {
                outputFile: 'assets/codemirror/codemirror.css',
                inputFiles: ['**/*.css']
            });

            if (isProduction) {
                jsTree = uglify(jsTree);
                cssTree = new CleanCSS(cssTree);
            }

            return mergeTrees([tree, jsTree, cssTree]);
        }
    };

    // put the files in vendor ready for importing into the test-support file
    if (environment === 'development') {
        config.vendor = codemirrorFiles;
    }

    return config;
};

function postcssPlugins() {
    let plugins = [{
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
            module: require('cssnano'),
            // cssnano minifies animations sometimes wrong, so they don't work anymore.
            // See: https://github.com/ben-eb/gulp-cssnano/issues/33#issuecomment-210518957
            options: {
                reduceIdents: {
                    keyframes: false
                },
                discardUnused: {
                    keyframes: false
                }
            }
        });
    }

    return plugins;
}

module.exports = function (defaults) {
    let app = new EmberApp(defaults, {
        'ember-cli-babel': {
            optional: ['es6.spec.symbols'],
            includePolyfill: true
        },
        'ember-composable-helpers': {
            only: ['toggle']
        },
        outputPaths: {
            app: {
                html: isProduction ? 'index.min.html' : 'index.html',
                js: assetLocation('ghost.js'),
                css: {
                    app: assetLocation('ghost.css'),
                    // TODO: find a way to use the .min file with the lazyLoader
                    'app-dark': 'assets/ghost-dark.css'
                }
            },
            vendor: {
                js: assetLocation('vendor.js'),
                css: assetLocation('vendor.css')
            }
        },
        postcssOptions: {
            compile: {
                enabled: true,
                plugins: postcssPlugins()
            }
        },
        fingerprint: {
            enabled: true,
            extensions: ['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'map']
        },
        minifyJS: {
            options: {
                output: {
                    semicolons: true
                }
            }
        },
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
            'password-generator': {
                import: ['lib/password-generator.js']
            },
            simplemde: {
                srcDir: 'debug',
                import: ['simplemde.js', 'simplemde.css']
            }
        },
        svg: {
            paths: [
                'public/assets/icons'
            ],
            optimize: {
                plugins: [
                    {removeDimensions: true},
                    {removeTitle: true},
                    {removeXMLNS: true},
                    // Transforms on groups are necessary to work around Firefox
                    // not supporting transform-origin on line/path elements.
                    {convertPathData: {
                        applyTransforms: false
                    }},
                    {moveGroupAttrsToElems: false}
                ]
            }
        }
    });

    // 'dem Scripts
    app.import('bower_components/validator-js/validator.js');
    app.import('bower_components/rangyinputs/rangyinputs-jquery-src.js');
    app.import('bower_components/keymaster/keymaster.js');
    app.import('bower_components/devicejs/lib/device.js');
    app.import('bower_components/google-caja/html-css-sanitizer-bundle.js');

    // pull things we rely on via lazy-loading into the test-support.js file so
    // that tests don't break when running via http://localhost:4200/tests
    if (app.env === 'development') {
        app.import('vendor/codemirror/lib/codemirror.js', {type: 'test'});
    }

    return app.toTree();
};
