**To set a type's default version**

The following ``set-type-default-version`` example sets the specified type version to be used as the default for this type. ::

    aws cloudformation set-type-default-version \
        --type RESOURCE \
        --type-name My::Logs::LogGroup \
        --version-id 00000003

This command produces no output.

For more information, see `Using the CloudFormation Registry <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/registry.html>`__ in the *AWS CloudFormation Users Guide*.
