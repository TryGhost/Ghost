**To delete a metrics configuration for a bucket**

The following ``delete-bucket-metrics-configuration`` example removes the metrics configuration for the specified bucket and ID. ::

    aws s3api delete-bucket-metrics-configuration \
        --bucket amzn-s3-demo-bucket \
        --id 123

This command produces no output.