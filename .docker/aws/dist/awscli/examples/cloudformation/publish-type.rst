**To publish an extension**

The following ``publish-type`` example publishes the specified extension to the CloudFormation registry as a public extension in this Region. ::

    aws cloudformation publish-type \
      --region us-west-2 \
      --type RESOURCE \
      --type-name Example::Test::1234567890abcdef0

Output::

    {
        "PublicTypeArn":"arn:aws:cloudformation:us-west-2::type/resource/000q6TfUovXsEMmgKowxDZLlwqr2QUshd2e75c8c/Example-Test-1234567890abcdef0/1.0.0"
    }

For more information, see `Using the AWS CloudFormation registry <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/registry.html>`__ in the *AWS CloudFormation User Guide*.