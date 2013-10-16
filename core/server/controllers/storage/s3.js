// S3 image storage
var AWS = require('aws-sdk'),
    fs = require('fs'),
    path = require('path'),
    when = require('when');

var s3ImageStore = {
    save: function (date, image, config) {
        var saved = when.defer(),
            path = 'ghost/images/',
            key = path + image.hash,
            fullUrl = 'https://s3.amazonaws.com/' + config.bucket + '/' + key,
            stream = fs.createReadStream(image.path),
            s3 = new AWS.S3();

        AWS.config.update({region: config.region});

        // TODO optimise by checking if object exists using headObject
        s3.client.putObject({Bucket: config.bucket, Key: key, Body: stream}).
            on('complete', function (res) {
                if (res.error) {
                    return saved.reject(res.error);
                }

                return saved.resolve(fullUrl);
            }).
            send();

        return saved.promise;
    }
};

module.exports = s3ImageStore;
