**To retrieve the bucket ownership settings of a bucket**

The following ``get-bucket-ownership-controls`` example retrieves the bucket ownership settings of a bucket. ::

    aws s3api get-bucket-ownership-controls \
        --bucket amzn-s3-demo-bucket

Output::

    {
        "OwnershipControls": {
            "Rules": [
                {
                    "ObjectOwnership": "BucketOwnerEnforced"
                }
            ]
        }
    }

For more information, see `Viewing the Object Ownership setting for an S3 bucket <https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-ownership-retrieving.html>`__ in the *Amazon S3 User Guide*.