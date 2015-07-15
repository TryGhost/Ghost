var assert = require('assert')
  , StreamTest = require('streamtest')
  , BufferStream = require('../src')
;

// Helpers
function syncBufferPrefixer(headerText) {
  return new BufferStream({
    objectMode: headerText instanceof Object
  }, function(err, buf, cb) {
    assert.equal(err, null);
    if(null === buf) {
      cb(null, Buffer(headerText));
    } else if(buf instanceof Array) {
      buf.unshift(headerText);
      cb(null, buf);
    } else {
      cb(null, Buffer.concat([Buffer(headerText), buf]));
    }
  });
}
function asyncBufferPrefixer(headerText) {
  return new BufferStream({
    objectMode: headerText instanceof Object
  }, function(err, buf, cb) {
    assert.equal(err, null);
    if(null === buf) {
      setTimeout(function() {
        cb(null, Buffer(headerText));
      }, 0);
    } else if(buf instanceof Array) {
      setTimeout(function() {
        buff.push(headerText);
        cb(null, buf);
      }, 0);
    } else {
      setTimeout(function() {
        cb(null, Buffer.concat([Buffer(headerText), buf]));
      }, 0);
    }
  });
}

// Tests
describe('bufferstreams', function() {

  it('should fail when callback is not a function', function() {
    assert.throws(function() {
      new BufferStream();
    });
  });

  // Iterating through versions
  StreamTest.versions.forEach(function(version) {

    describe('for ' + version + ' streams', function() {

      describe('in buffer mode', function() {

        describe('synchonously', function() {

          it('should work with one pipe', function(done) {
            StreamTest[version].fromChunks(['te', 'st'])
              .pipe(syncBufferPrefixer('plop'))
              .pipe(StreamTest[version].toText(function(err, data) {
                if(err) {
                  return done(err);
                }
                assert.equal(data, 'ploptest');
                done();
              }));
          });

          it('should work when returning a null buffer', function(done) {
          
            StreamTest[version].fromChunks(['te', 'st'])
              .pipe(new BufferStream(function(err, buf, cb){
              cb(null, null);
              }))
              .pipe(StreamTest[version].toText(function(err, data) {
                if(err) {
                  return done(err);
                }
                assert.equal(data, '');
                done();
              }));
          });

          it('should work with multiple pipes', function(done) {
            StreamTest[version].fromChunks(['te', 'st'])
              .pipe(syncBufferPrefixer('plop'))
              .pipe(syncBufferPrefixer('plip'))
              .pipe(syncBufferPrefixer('plap'))
              .pipe(StreamTest[version].toText(function(err, data) {
                if(err) {
                  return done(err);
                }
                assert.equal(data, 'plapplipploptest');
                done();
              }));
          });

        });

        describe('asynchonously', function() {

          it('should work with one pipe', function(done) {
            StreamTest[version].fromChunks(['te', 'st'])
              .pipe(asyncBufferPrefixer('plop'))
              .pipe(StreamTest[version].toText(function(err, data) {
                if(err) {
                  return done(err);
                }
                assert.equal(data, 'ploptest');
                done();
              }));
          });

          it('should work when returning a null buffer', function(done) {
          
            StreamTest[version].fromChunks(['te', 'st'])
              .pipe(BufferStream(function(err, buf, cb){
              cb(null, null);
              }))
              .pipe(StreamTest[version].toText(function(err, data) {
                if(err) {
                  return done(err);
                }
                assert.equal(data, '');
                done();
              }));
          });

          it('should work with multiple pipes', function(done) {
            StreamTest[version].fromChunks(['te', 'st'])
              .pipe(asyncBufferPrefixer('plop'))
              .pipe(asyncBufferPrefixer('plip'))

              .pipe(asyncBufferPrefixer('plap'))
              .pipe(StreamTest[version].toText(function(err, data) {
                if(err) {
                  return done(err);
                }
                assert.equal(data, 'plapplipploptest');
                done();
              }));
          });

        });

      });

      describe('in object mode', function() {
        var object1 = {txt: 'te'};
        var object2 = {txt: 'st'};
        var object3 = {txt: 'e'};
        var object4 = {txt: 'd'};
        var object5 = {txt: 'u'};
        var object6 = {txt: 'ni'};
        var object7 = {txt: 't'};

        describe('synchonously', function() {

          it('should work with one pipe', function(done) {
            StreamTest[version].fromObjects([object1, object2])
              .pipe(syncBufferPrefixer(object4))
              .pipe(StreamTest[version].toObjects(function(err, objs) {
                if(err) {
                  return done(err);
                }
                assert.deepEqual(objs, [object4, object1, object2]);
                done();
              }));
          });

          it('should work when returning a null buffer', function(done) {
          
            StreamTest[version].fromObjects([object1, object2])
              .pipe(new BufferStream({
                objectMode: true
              }, function(err, buf, cb){
                cb(null, null);
              }))
              .pipe(StreamTest[version].toObjects(function(err, objs) {
                if(err) {
                  return done(err);
                }
                assert.equal(objs.length, 0);
                done();
              }));
          });

          it('should work with multiple pipes', function(done) {
            StreamTest[version].fromObjects([object1, object2])
              .pipe(syncBufferPrefixer(object4))
              .pipe(syncBufferPrefixer(object5))
              .pipe(syncBufferPrefixer(object6))
              .pipe(StreamTest[version].toObjects(function(err, objs) {
                if(err) {
                  return done(err);
                }
                assert.deepEqual(objs, [object6, object5, object4, object1, object2]);
                done();
              }));
          });

        });

        describe('asynchonously', function() {

          it('should work with one pipe', function(done) {
            StreamTest[version].fromObjects([object1, object2])
              .pipe(syncBufferPrefixer(object4))
              .pipe(StreamTest[version].toObjects(function(err, objs) {
                if(err) {
                  return done(err);
                }
                assert.deepEqual(objs, [object4, object1, object2]);
                done();
              }));
          });

          it('should work when returning a null buffer', function(done) {
            StreamTest[version].fromObjects([object1, object2])
              .pipe(BufferStream({
                objectMode: true
              }, function(err, buf, cb){
                cb(null, null);
              }))
              .pipe(StreamTest[version].toObjects(function(err, objs) {
                if(err) {
                  return done(err);
                }
                assert.equal(objs.length, 0);
                done();
              }));
          });

          it('should work with multiple pipes', function(done) {
            StreamTest[version].fromObjects([object1, object2])
              .pipe(syncBufferPrefixer(object4))
              .pipe(syncBufferPrefixer(object5))
              .pipe(syncBufferPrefixer(object6))
              .pipe(StreamTest[version].toObjects(function(err, objs) {
                if(err) {
                  return done(err);
                }
                assert.deepEqual(objs, [object6, object5, object4, object1, object2]);
                done();
              }));
          });

        });

      });

    });

  });

});


