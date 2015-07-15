/*!
 * vinyl-bufferstream | MIT (c) Shinnosuke Watanabe
 * https://github.com/shinnn/vinyl-bufferstream
*/
'use strict';

var BufferStreams = require('bufferstreams');

module.exports = function VinylBufferStream(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError(
      fn +
      ' is not a function. The argument to VinylBufferStream constructor must be a function.'
    );
  }

  return function vinylBufferStream(file, cb) {
    if (typeof cb !== 'function') {
      throw new TypeError(
        cb +
        ' is not a function. ' +
        'The second argument to VinylBufferStream instance must be a function.'
      );
    }

    if (!file || typeof file.isNull !== 'function') {
      cb(new TypeError('Expecting a vinyl file object.'));
      return;
    }

    if (file.isNull()) {
      cb(null, null);
      return;
    }

    if (file.isStream()) {
      var stream = file.contents.pipe(new BufferStreams(function(none, buf, done) {
        fn(buf, function(err, result) {
          done(err, result);
          if (err) {
            cb(err);
            return;
          }
          cb(null, stream);
        });
      }));
      return;
    }

    fn(file.contents, cb);
  };
};
