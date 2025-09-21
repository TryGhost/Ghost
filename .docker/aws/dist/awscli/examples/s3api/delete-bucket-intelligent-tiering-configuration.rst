**To remove an S3 Intelligent-Tiering configuration on a bucket**

The following ``delete-bucket-intelligent-tiering-configuration`` example removes an S3 Intelligent-Tiering configuration, named ExampleConfig, on a bucket. ::

    aws s3api delete-bucket-intelligent-tiering-configuration \
        --bucket amzn-s3-demo-bucket \
        --id ExampleConfig

This command produces no output.

For more information, see `Using S3 Intelligent-Tiering <https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-intelligent-tiering.html>`__ in the *Amazon S3 User Guide*.