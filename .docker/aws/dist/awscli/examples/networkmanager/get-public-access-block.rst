**To set or modify the block public access configuration for a bucket**

The following ``get-public-access-block`` example displays the block public access configuration for the specified bucket. ::

    aws s3api get-public-access-block --bucket amzn-s3-demo-bucket

Output::

    {
        "PublicAccessBlockConfiguration": {
            "IgnorePublicAcls": true,
            "BlockPublicPolicy": true,
            "BlockPublicAcls": true,
            "RestrictPublicBuckets": true
        }
    }
