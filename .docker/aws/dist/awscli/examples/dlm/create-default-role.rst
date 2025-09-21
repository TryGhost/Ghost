**To create the required IAM role for Amazon DLM**

The following ``dlm create-default-role`` example creates the AWSDataLifecycleManagerDefaultRole default role for managing snapshots. ::

    aws dlm create-default-role \
        --resource-type snapshot

This command produces no output.

For more information, see `Default service roles for Amazon Data Lifecycle Manager <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/service-role.html#default-service-roles>`__ in the *Amazon Elastic Compute Cloud User Guide*.