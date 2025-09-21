**To detect unsafe content in an image**

The following ``detect-moderation-labels`` command detects unsafe content in the specified image stored in an Amazon S3 bucket. ::

    aws rekognition detect-moderation-labels \
        --image "S3Object={Bucket=MyImageS3Bucket,Name=gun.jpg}"

Output::

    {
        "ModerationModelVersion": "3.0", 
        "ModerationLabels": [
            {
                "Confidence": 97.29618072509766, 
                "ParentName": "Violence", 
                "Name": "Weapon Violence"
            }, 
            {
                "Confidence": 97.29618072509766, 
                "ParentName": "", 
                "Name": "Violence"
            }
        ]
    }

For more information, see `Detecting Unsafe Images <https://docs.aws.amazon.com/rekognition/latest/dg/procedure-moderate-images.html>`__ in the *Amazon Rekognition Developer Guide*.
