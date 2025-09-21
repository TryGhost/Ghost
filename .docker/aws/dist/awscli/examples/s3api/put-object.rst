**Example 1: Upload an object to Amazon S3** 

The following ``put-object`` command example uploads an object to Amazon S3. ::

    aws s3api put-object \
        --bucket amzn-s3-demo-bucket \
        --key my-dir/MySampleImage.png \
        --body MySampleImage.png

For more information about uploading objects, see `Uploading Objects < http://docs.aws.amazon.com/AmazonS3/latest/dev/UploadingObjects.html>`__ in the *Amazon S3 Developer Guide*.

**Example 2: Upload a video file to Amazon S3** 

The following ``put-object`` command example uploads a video file. ::

    aws s3api put-object \
        --bucket amzn-s3-demo-bucket \
        --key my-dir/big-video-file.mp4 \
        --body /media/videos/f-sharp-3-data-services.mp4

For more information about uploading objects, see `Uploading Objects < http://docs.aws.amazon.com/AmazonS3/latest/dev/UploadingObjects.html>`__ in the *Amazon S3 Developer Guide*.
