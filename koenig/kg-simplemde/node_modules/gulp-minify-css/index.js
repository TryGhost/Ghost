'use strict';

var path = require('path');

var applySourceMap = require('vinyl-sourcemaps-apply');
var CleanCSS = require('clean-css');
var objectAssign = require('object-assign');
var PluginError = require('gulp-util').PluginError;
var Transform = require('readable-stream/transform');
var VinylBufferStream = require('vinyl-bufferstream');

module.exports = function gulpMinifyCSS(options) {
  options = options || {};

  return new Transform({
    objectMode: true,
    transform: function modifyContents(file, enc, cb) {
      var run = new VinylBufferStream(function(buf, done) {
        var fileOptions = objectAssign({target: file.path}, options);

        // https://github.com/jakubpawlowicz/clean-css/blob/v3.3.0/bin/cleancss#L83-L84
        if (fileOptions.relativeTo === undefined && (fileOptions.root || file.path)) {
          fileOptions.relativeTo = path.dirname(path.resolve(options.root || file.path));
        }

        if ((options.sourceMap === true || options.sourceMap === undefined) && file.sourceMap) {
          fileOptions.sourceMap = JSON.stringify(file.sourceMap);
        }

        var cssFile;

        if (file.path) {
          cssFile = {};
          cssFile[file.path] = {styles: buf.toString()};
        } else {
          cssFile = buf.toString();
        }

        new CleanCSS(fileOptions).minify(cssFile, function(errors, css) {
          if (errors) {
            done(errors.join(' '));
            return;
          }

          if (css.sourceMap) {
            var map = JSON.parse(css.sourceMap);
            map.file = path.relative(file.base, file.path);
            map.sources = map.sources.map(function(src) {
              if (/^(https?:)?\/\//.test(src)) {
                return src;
              }

              return path.relative(file.base, src);
            });

            applySourceMap(file, map);
          }

          done(null, new Buffer(css.styles));
        });
      });

      var self = this;

      run(file, function(err, contents) {
        if (err) {
          self.emit('error', new PluginError('gulp-minify-css', err, {fileName: file.path}));
        } else {
          file.contents = contents;
          self.push(file);
        }
        cb();
      });
    }
  });
};
