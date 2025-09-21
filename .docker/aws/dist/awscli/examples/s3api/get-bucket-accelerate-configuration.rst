**To retrieve the accelerate configuration of a bucket**

The following ``get-bucket-accelerate-configuration`` example retrieves the accelerate configuration for the specified bucket. ::

    aws s3api get-bucket-accelerate-configuration \
        --bucket amzn-s3-demo-bucket

Output::

    {
        "Status": "Enabled"
    }
