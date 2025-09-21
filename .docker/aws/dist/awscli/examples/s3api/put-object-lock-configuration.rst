**To set an object lock configuration on a bucket**

The following ``put-object-lock-configuration`` example sets a 50-day object lock on the specified bucket. ::

    aws s3api put-object-lock-configuration \
        --bucket amzn-s3-demo-bucket-with-object-lock \
        --object-lock-configuration '{ "ObjectLockEnabled": "Enabled", "Rule": { "DefaultRetention": { "Mode": "COMPLIANCE", "Days": 50 }}}'

This command produces no output.