**To list public block access settings for an account**

The following ``get-public-access-block`` example displays the block public access settings for the specified account. ::

    aws s3control get-public-access-block \
        --account-id 123456789012

Output::

    {
       "PublicAccessBlockConfiguration": {
          "BlockPublicPolicy": true,
          "RestrictPublicBuckets": true,
          "IgnorePublicAcls": true,
          "BlockPublicAcls": true
       }
    }
