/* jscs:disable */
/* global require, module */

var EmberApp = require('ember-cli/lib/broccoli/ember-app'),
    environment = EmberApp.env(),
    isProduction = environment === 'production',
    mythCompress = isProduction || environment === 'test',
    disabled = {enabled: false},
    assetLocation;

assetLocation = function (fileName) {
    if (isProduction) {
        fileName = fileName.replace('.', '.min.');
    }
    return '/assets/' + fileName;
};

module.exports = function (defaults) {
    var app = new EmberApp(defaults, {
        babel: {
            optional: ['es6.spec.symbols'],
            includePolyfill: true
        },
        outputPaths: {
            app: {
                js: assetLocation('ghost.js')
            },
            vendor: {
                js:  assetLocation('vendor.js'),
                css: assetLocation('vendor.css')
            }
        },
        mythOptions: {
            source: './app/styles/app.css',
            inputFile: 'app.css',
            browsers: 'last 2 versions',
            // @TODO: enable sourcemaps for development without including them in the release
            sourcemap: false,
            compress: mythCompress,
            outputFile: isProduction ? 'ghost.min.css' : 'ghost.css'
        },
        hinting: false,
        fingerprint: disabled,
        'ember-cli-selectize': {
            theme: false
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
    app.import('bower_components/moment/moment.js');
    app.import('bower_components/keymaster/keymaster.js');
    app.import('bower_components/devicejs/lib/device.js');
    app.import('bower_components/jquery-ui/jquery-ui.js');
    app.import('bower_components/jquery-file-upload/js/jquery.fileupload.js');
    app.import('bower_components/blueimp-load-image/js/load-image.all.min.js');
    app.import('bower_components/jquery-file-upload/js/jquery.fileupload-process.js');
    app.import('bower_components/jquery-file-upload/js/jquery.fileupload-image.js');
    app.import('bower_components/google-caja/html-css-sanitizer-bundle.js');
    app.import('bower_components/jqueryui-touch-punch/jquery.ui.touch-punch.js');
    app.import('bower_components/codemirror/lib/codemirror.js');
    app.import('bower_components/codemirror/mode/htmlmixed/htmlmixed.js');
    app.import('bower_components/codemirror/mode/xml/xml.js');
    app.import('bower_components/codemirror/mode/css/css.js');
    app.import('bower_components/codemirror/mode/javascript/javascript.js');
    app.import('bower_components/xregexp/xregexp-all.js');
    app.import('bower_components/password-generator/lib/password-generator.js');
    app.import('bower_components/blueimp-md5/js/md5.js');

    if (app.env === 'test') {
        app.import(app.bowerDirectory + '/jquery.simulate.drag-sortable/jquery.simulate.drag-sortable.js', {type: 'test'});
        app.import(app.bowerDirectory + '/jquery-deparam/jquery-deparam.js', {type: 'test'});
    }

    // 'dem Styles
    app.import('bower_components/codemirror/lib/codemirror.css');
    app.import('bower_components/codemirror/theme/xq-light.css');

    return app.toTree();
};
