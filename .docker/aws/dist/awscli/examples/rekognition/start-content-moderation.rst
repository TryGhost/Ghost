**To start the recognition of unsafe content in a stored video**

The following ``start-content-moderation`` command starts a job to detect unsafe content in the specified video file stored in an Amazon S3 bucket. ::

    aws rekognition start-content-moderation \
        --video "S3Object={Bucket=MyVideoS3Bucket,Name=MyVideoFile.mpg}"

Output::

    {
        "JobId": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    }

For more information, see `Detecting Unsafe Stored Videos <https://docs.aws.amazon.com/rekognition/latest/dg/procedure-moderate-videos.html>`__ in the *Amazon Rekognition Developer Guide*.
