**To deactivate a type**

The following ``deactivate-type`` example deactivates a public extension that was previously activated in this account and Region. ::

    aws cloudformation deactivate-type \
        --region us-west-2 \
        --type MODULE \
        --type-name Example::Test::Type::MODULE

This command produces no output.

For more information, see `Using the AWS CloudFormation registry <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/registry.html>`__ in the *AWS CloudFormation User Guide*.