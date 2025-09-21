**To search for faces in a collection that match faces detected in a video**

The following ``start-face-search`` command starts a job to search for faces in a collection that match faces detected in the specified video file in an Amazon S3 bucket. ::

    aws rekognition start-face-search \
        --video "S3Object={Bucket=MyVideoS3Bucket,Name=MyVideoFile.mpg}" \
        --collection-id collection 

Output::

    {
        "JobId": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    }

For more information, see `Searching Stored Videos for Faces <https://docs.aws.amazon.com/rekognition/latest/dg/procedure-person-search-videos.html>`__ in the *Amazon Rekognition Developer Guide*.
