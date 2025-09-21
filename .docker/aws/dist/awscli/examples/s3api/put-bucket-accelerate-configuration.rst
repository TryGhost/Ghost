**To set the accelerate configuration of a bucket**

The following ``put-bucket-accelerate-configuration`` example enables the accelerate configuration for the specified bucket. ::

    aws s3api put-bucket-accelerate-configuration \
        --bucket amzn-s3-demo-bucket \
        --accelerate-configuration Status=Enabled

This command produces no output.
