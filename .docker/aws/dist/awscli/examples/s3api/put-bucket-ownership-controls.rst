**To update the bucket ownership settings of a bucket**

The following ``put-bucket-ownership-controls`` example updates the bucket ownership settings of a bucket. ::

    aws s3api put-bucket-ownership-controls \
        --bucket amzn-s3-demo-bucket \
        --ownership-controls="Rules=[{ObjectOwnership=BucketOwnerEnforced}]"

This command produces no output.

For more information, see `Setting Object Ownership on an existing bucket <https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-ownership-existing-bucket.html>`__ in the *Amazon S3 User Guide*.