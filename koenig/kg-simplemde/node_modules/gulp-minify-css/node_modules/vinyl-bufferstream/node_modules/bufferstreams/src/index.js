var PassThrough = require('readable-stream').PassThrough;
var util = require('util');

// Inherit of PassThrough stream
util.inherits(BufferStream, PassThrough);

// Constructor
function BufferStream(options, cb) {
  // Ensure new were used
  if (!(this instanceof BufferStream)) {
    return new BufferStream(options, cb);
  }

  // Cast args
  if(options instanceof Function) {
    cb = options;
    options = {};
  }
  options = options || {};
  if(!(cb instanceof Function)) {
    throw new Error('The given callback must be a function.');
  }
  this.__objectMode = options.objectMode;

  // Parent constructor
  PassThrough.call(this, options);

  // Keep a reference to the callback
  this._cb = cb;

  // Internal buffer
  this._buf = options.objectMode ? [] : Buffer('');
}

BufferStream.prototype._transform = function(chunk, encoding, done) {

  if(this.__objectMode) {
    this._buf.push(chunk);
  } else {
    this._buf = Buffer.concat([this._buf, chunk], this._buf.length + chunk.length);
  }

  done();

};

BufferStream.prototype._flush = function(done) {
  var _this = this;

  this._cb(null, this._buf, function(err, buf) {
    if(buf && buf.length) {
      if(_this.__objectMode) {
        buf.forEach(function(chunk) {
          _this.push(chunk);
        });
      } else {
        _this.push(buf);
      }
    }
    done();
  });

};

module.exports = BufferStream;
