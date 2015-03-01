// Deps
global.chai = require('chai');
global.assert = chai.assert;
chai.should();

var fs = require('fs');
var multisuite = require('./support/multisuite');

var scripts = {
  'jq-1.7':  fs.readFileSync('vendor/jquery-1.7.js'),
  'jq-1.8':  fs.readFileSync('vendor/jquery-1.8.js'),
  'jq-1.9':  fs.readFileSync('vendor/jquery-1.9.js'),
  'jq-1.10': fs.readFileSync('vendor/jquery-1.10.js'),
  'jq-2.0':  fs.readFileSync('vendor/jquery-2.0.js'),
  'nprogress': fs.readFileSync('nprogress.js')
};

function myEnv(jq) {
  var jsdom = require('jsdom');
  return function(done) {
    jsdom.env({
      html: '<!doctype html><html><head></head><body></body></html>',
      src: [ scripts[jq], scripts.nprogress ],
      done: function(errors, window) {
        window.console = console;
        global.window  = window;
        global.$       = window.$;
        global.NProgress = window.NProgress;
        done(errors);
      }
    });
  };
}

if (process.env.fast) {
  before(myEnv('jq-1.10'));
  global.testSuite = describe;
} else {
  global.testSuite = multisuite(['jq-1.8', 'jq-1.9', 'jq-1.10', 'jq-2.0'], myEnv);
}
