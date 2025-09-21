**To deregister a type version**

The following ``deregister-type`` example removes the specified type version from active use in the CloudFormation registry, so that it can no longer be used in CloudFormation operations. ::

    aws cloudformation deregister-type \
        --type RESOURCE \
        --type-name My::Logs::LogGroup \
        --version-id 00000002

This command produces no output.

For more information, see `Using the CloudFormation Registry <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/registry.html>`__ in the *AWS CloudFormation Users Guide*.
