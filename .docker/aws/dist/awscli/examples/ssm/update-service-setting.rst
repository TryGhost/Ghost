**To update the service setting for Parameter Store throughput**

The following ``update-service-setting`` example updates the current service setting for Parameter Store throughput in the specified region to use increased throughput. ::

    aws ssm update-service-setting \
        --setting-id arn:aws:ssm:us-east-1:123456789012:servicesetting/ssm/parameter-store/high-throughput-enabled \
        --setting-value true

This command produces no output.

For more information, see `Increasing Parameter Store Throughput <https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-throughput.html>`__ in the *AWS Systems Manager User Guide*.
