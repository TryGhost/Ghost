**To detect objects and scenes in a video**

The following ``start-label-detection`` command starts a job to detect objects and scenes in the specified video file stored in an Amazon S3 bucket. ::

    aws rekognition start-label-detection \
        --video "S3Object={Bucket=MyVideoS3Bucket,Name=MyVideoFile.mpg}"

Output::

    {
        "JobId": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    }

For more information, see `Detecting Labels in a Video <https://docs.aws.amazon.com/rekognition/latest/dg/labels-detecting-labels-video.html>`__ in the *Amazon Rekognition Developer Guide*.
