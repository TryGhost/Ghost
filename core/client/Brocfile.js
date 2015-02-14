/* global require, module */

var EmberApp = require('ember-cli/lib/broccoli/ember-app');

var app = new EmberApp(
  {
    sourcemaps: {enabled: false} //see https://github.com/ember-cli/ember-cli/issues/2912
  }
);

app.import('bower_components/loader.js/loader.js');
app.import('bower_components/jquery/dist/jquery.js');
app.import('bower_components/ic-ajax/dist/globals/main.js');
app.import('bower_components/ember-load-initializers/ember-load-initializers.js');
app.import('bower_components/validator-js/validator.js');
app.import('bower_components/codemirror/lib/codemirror.js');
app.import('bower_components/codemirror/addon/mode/overlay.js');
app.import('bower_components/codemirror/mode/markdown/markdown.js');
app.import('bower_components/codemirror/mode/gfm/gfm.js');
app.import('bower_components/showdown-ghost/src/showdown.js');
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

app.import('vendor/showdown/extensions/ghostgfm.js');
app.import('vendor/showdown/extensions/ghostimagepreview.js');
app.import('vendor/showdown/extensions/ghostfootnotes.js');
app.import('vendor/showdown/extensions/ghosthighlight.js');

module.exports = app.toTree();
