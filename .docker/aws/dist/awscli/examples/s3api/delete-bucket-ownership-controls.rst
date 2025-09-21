**To remove the bucket ownership settings of a bucket**

The following ``delete-bucket-ownership-controls`` example removes the bucket ownership settings of a bucket. ::

    aws s3api delete-bucket-ownership-controls \
        --bucket amzn-s3-demo-bucket

This command produces no output.

For more information, see `Setting Object Ownership on an existing bucket <https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-ownership-existing-bucket.html>`__ in the *Amazon S3 User Guide*.