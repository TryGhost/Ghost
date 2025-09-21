**To set a metrics configuration for a bucket**

The following ``put-bucket-metrics-configuration`` example sets a metric configuration with ID 123 for the specified bucket. ::

    aws s3api put-bucket-metrics-configuration \
        --bucket amzn-s3-demo-bucket \
        --id 123 \
        --metrics-configuration '{"Id": "123", "Filter": {"Prefix": "logs"}}'

This command produces no output.
