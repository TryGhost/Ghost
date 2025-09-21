**To detect faces in a video**

The following ``start-face-detection`` command starts a job to detect faces in the specified video file stored in an Amazon S3 bucket. ::

    aws rekognition start-face-detection 
        --video "S3Object={Bucket=MyVideoS3Bucket,Name=MyVideoFile.mpg}"

Output::

    {
        "JobId": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    }

For more information, see `Detecting Faces in a Stored Video <https://docs.aws.amazon.com/rekognition/latest/dg/faces-sqs-video.html>`__ in the *Amazon Rekognition Developer Guide*.
