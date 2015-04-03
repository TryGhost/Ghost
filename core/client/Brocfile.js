/* global require, module */

var EmberApp = require('ember-cli/lib/broccoli/ember-app'),
    isProduction = EmberApp.env() === 'production',
    disabled = {enabled: false},
    assetLocation,
    app;

assetLocation = function (fileName) {
    if (isProduction) {
        fileName = fileName.replace('.', '.min.');
    }
    return '/assets/' + fileName;
};

app = new EmberApp({
    outputPaths: {
        app: {
            js: assetLocation('ghost.js')
//          css: see config/environment.js (sassOptions)
        },
        vendor: {
            js:  assetLocation('vendor.js'),
            css: assetLocation('vendor.css')
        }
    },
    hinting: false,
    fingerprint: disabled,
    sourcemaps: disabled // see https://github.com/ember-cli/ember-cli/issues/2912
});

app.import('bower_components/loader.js/loader.js');
app.import('bower_components/jquery/dist/jquery.js');
app.import('bower_components/ic-ajax/dist/globals/main.js');
app.import('bower_components/ember-load-initializers/ember-load-initializers.js');
app.import('bower_components/validator-js/validator.js');
app.import('bower_components/rangyinputs/rangyinputs-jquery-src.js');
app.import('bower_components/showdown-ghost/src/showdown.js');
app.import('bower_components/showdown-ghost/src/extensions/ghostgfm.js');
app.import('bower_components/showdown-ghost/src/extensions/ghostimagepreview.js');
app.import('bower_components/showdown-ghost/src/extensions/footnotes.js');
app.import('bower_components/showdown-ghost/src/extensions/highlight.js');
app.import('bower_components/moment/moment.js');
app.import('bower_components/keymaster/keymaster.js');
app.import('bower_components/device/lib/device.js');
app.import('bower_components/jquery-ui/ui/jquery-ui.js');
app.import('bower_components/jquery-file-upload/js/jquery.fileupload.js');
app.import('bower_components/fastclick/lib/fastclick.js');
app.import('bower_components/nprogress/nprogress.js');
app.import('bower_components/ember-simple-auth/simple-auth.js');
app.import('bower_components/ember-simple-auth/simple-auth-oauth2.js');
app.import('bower_components/google-caja/html-css-sanitizer-bundle.js');
app.import('bower_components/nanoscroller/bin/javascripts/jquery.nanoscroller.js');
app.import('bower_components/jqueryui-touch-punch/jquery.ui.touch-punch.js');
app.import('bower_components/codemirror/lib/codemirror.js');
app.import('bower_components/codemirror/lib/codemirror.css');
app.import('bower_components/codemirror/theme/xq-light.css');
app.import('bower_components/codemirror/mode/htmlmixed/htmlmixed.js');
app.import('bower_components/codemirror/mode/xml/xml.js');
app.import('bower_components/codemirror/mode/css/css.js');
app.import('bower_components/codemirror/mode/javascript/javascript.js');

module.exports = app.toTree();
