**To retrieve an object lock configuration for a bucket**

The following ``get-object-lock-configuration`` example retrieves the object lock configuration for the specified bucket. ::

    aws s3api get-object-lock-configuration \
        --bucket amzn-s3-demo-bucket-with-object-lock

Output::

    {
        "ObjectLockConfiguration": {
            "ObjectLockEnabled": "Enabled",
            "Rule": {
                "DefaultRetention": {
                    "Mode": "COMPLIANCE", 
                    "Days": 50
                }
            }
        }
    }
