**To edit block public access settings for an account**

The following ``put-public-access-block`` example toggles all block public access settings to ``true`` for the specified account. ::

    aws s3control put-public-access-block \
        --account-id 123456789012 \
        --public-access-block-configuration '{"BlockPublicAcls": true, "IgnorePublicAcls": true, "BlockPublicPolicy": true, "RestrictPublicBuckets": true}'

This command produces no output.
