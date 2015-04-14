var _           = require('lodash'),
    fs          = require('fs-extra'),
    http        = require('http'),
    path        = require('path'),
    util        = require('util'),
    Promise     = require('bluebird'),
    qiniu       = require('qiniu'),
 
    options     = {},
 
    mimeTypes   = {
        '.jpg':  'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif':  'image/gif',
        '.png':  'image/png',
        '.svg':  'image/svg+xml',
        '.svgz': 'image/svg+xml'
    },
 
    mountPoint = '/content/images',
    baseStore = require('../../../core/server/storage/base');
 

function QINIUStore(config) {
    options = config;
    qiniu.conf.ACCESS_KEY = options.AK;
    qiniu.conf.SECRET_KEY = options.SK;
}
 
util.inherits( QINIUStore, baseStore );

QINIUStore.prototype.save = function (image) {
    
    var self = this;
    var targetDir = self.getTargetDir( mountPoint );

    // console.log( 'QINIUStore::options=', options );
    // console.log( 'QINIUStore::targetDir=', targetDir );

    return new Promise(function (resolve, reject)  {

        self.getUniqueFileName( self, image, targetDir).then(function (filename) {

            var putPolicy = new qiniu.rs.PutPolicy( options.bucket );
            var uptoken = putPolicy.token();
            var key = options.prefix + filename;

             console.log( 'QINIUStore::UPLOAD filename=', filename );
            // console.log( 'QINIUStore::image.path=', image.path );
            // console.log( 'QINIUStore::qiniu.conf=', qiniu.conf );
            // console.log( 'QINIUStore::uptoken=', uptoken );
             console.log( 'QINIUStore::UPLOAD key=', key );

            // 上传文件到云存储
            qiniu.io.putFile(uptoken, key, image.path, null, function(err, ret) {

                if(!err) {
                  // 上传成功， 处理返回值
                  // console.log(ret.key, ret.hash);
                  return resolve( filename );
                  // return resolve( 'http://7xil42.com1.z0.glb.clouddn.com/lctest/content/images/2015/04/----.png');


                  // ret.key & ret.hash
                } else {
                  // 上传失败， 处理返回代码
                 // console.log('QINIUStore save ERROR:' , err );
                  return reject( err );
                }
            });

        }).catch(function (err)  {
            console.error('Error', err );
        });
    });
};
 
QINIUStore.prototype.exists = function (filename ) {

    return new Promise(function (resolve, reject) {

        var key = options.prefix + filename;
        var client = new qiniu.rs.Client();
        
        console.log( 'QINIUStore::CHECK key=', key );
        console.log( 'QINIUStore::CHECK filename=', filename );

        client.stat( options.bucket , key, function(err, ret) {
          if (!err) {
            // ok 
            // ret has keys (hash, fsize, putTime, mimeType)
            // console.log( 'QINIUStore:: CHECK ret', ret );
            return resolve(true);

          } else if ( _.has( err, 'code') ) {

            if ( err.code === 612 ) {  // no such file or directory
                return resolve( false );

            } else {
                console.log('QINIUStore CHECK ERROR:' , err );
                return reject( err );
            }

          } else {
             console.log('QINIUStore CHECK ERROR:' , err );
             return reject( err );
          }

        });

    });
};

 
QINIUStore.prototype.serve = function () {
    return function (req, res, next ) {
        res.redirect( 301, options.protocol + '://' + options.domain + '/' + options.prefix + mountPoint + req.path );
        // next();
    };

};
 
module.exports = QINIUStore;