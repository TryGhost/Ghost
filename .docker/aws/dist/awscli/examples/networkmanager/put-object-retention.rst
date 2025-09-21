**To set an object retention configuration for an object**

The following ``put-object-retention`` example sets an object retention configuration for the specified object until 2025-01-01. ::

    aws s3api put-object-retention \
        --bucket amzn-s3-demo-bucket-with-object-lock \
        --key doc1.rtf \
        --retention '{ "Mode": "GOVERNANCE", "RetainUntilDate": "2025-01-01T00:00:00" }'

This command produces no output.