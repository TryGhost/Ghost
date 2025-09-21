**To start the recognition of celebrities in a stored video**

The following ``start-celebrity-recognition`` command starts a job to look for celebrities in the specified video file stored in an Amazon S3 bucket. ::

    aws rekognition start-celebrity-recognition \
        --video "S3Object={Bucket=MyVideoS3Bucket,Name=MyVideoFile.mpg}"

Output::

    {
        "JobId": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    }

For more information, see `Recognizing Celebrities in a Stored Video <https://docs.aws.amazon.com/rekognition/latest/dg/celebrities-video-sqs.html>`__ in the *Amazon Rekognition Developer Guide*.
