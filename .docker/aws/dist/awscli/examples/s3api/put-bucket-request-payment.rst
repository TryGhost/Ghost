**Example 1: To enable ``requester pays`` configuration for a bucket**

The following ``put-bucket-request-payment`` example enables ``requester pays`` for the specified bucket. ::

    aws s3api put-bucket-request-payment \
        --bucket amzn-s3-demo-bucket \
        --request-payment-configuration '{"Payer":"Requester"}'

This command produces no output.

**Example 2: To disable ``requester pays`` configuration for a bucket**

The following ``put-bucket-request-payment`` example disables ``requester pays`` for the specified bucket. ::

    aws s3api put-bucket-request-payment \
        --bucket amzn-s3-demo-bucket \
        --request-payment-configuration '{"Payer":"BucketOwner"}'

This command produces no output.
