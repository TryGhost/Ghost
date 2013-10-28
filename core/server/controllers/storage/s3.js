// S3 image storage
var AWS = require('aws-sdk'),
    errors = require('../../errorHandling'),
    fs = require('fs'),
    path = require('path'),
    when = require('when');

var s3ImageStore = {
    save: function (date, image, config) {
        var saved = when.defer(),
            path = 'ghost/images/',
            key = path + image.hash,
            fullUrl = 'https://s3.amazonaws.com/' + config.s3.bucket + '/' + key,
            stream = fs.createReadStream(image.path),
            s3 = null;

        AWS.config.update({
            region: config.s3.region,
            accessKeyId: config.s3.accessKeyId,
            secretAccessKey: config.s3.secretAccessKey
        });

        s3 = new AWS.S3();

        // TODO optimise by checking if object exists using headObject
        s3.client.putObject({ Bucket: config.s3.bucket, Key: key, Body: stream }).
            on('complete', function (res) {
                if (res.error) {
                    errors.logError(res.error);
                    return saved.reject(res.error);
                }

                return saved.resolve(fullUrl);
            }).
            send();

        return saved.promise;
    }
};

module.exports = s3ImageStore;
