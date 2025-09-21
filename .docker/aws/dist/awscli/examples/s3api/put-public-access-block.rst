**To set the block public access configuration for a bucket**

The following ``put-public-access-block`` example sets a restrictive block public access configuration for the specified bucket. ::

    aws s3api put-public-access-block \
        --bucket amzn-s3-demo-bucket \
        --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

This command produces no output.
