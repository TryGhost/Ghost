**To list an extension's version**

The following ``list-type-versions`` example returns summary information about the versions of an extension. ::

    aws cloudformation list-type-versions \
      --endpoint https://example.com \
      --region us-west-2 \
      --type RESOURCE \
      --type-name My::Resource::Example \
      --publisher-id 123456789012

This command produces no output.

For more information, see `Using the AWS CloudFormation registry <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/registry.html>`__ in the *AWS CloudFormation User Guide*.