**To activate a type**

The following ``activate-type`` example activates a public third-party extension, making it available for use in stack templates. ::

    aws cloudformation activate-type \
        --region us-west-2 \
        --type RESOURCE \
        --type-name Example::Test::1234567890abcdef0 \
        --type-name-alias Example::Test::Alias

Output::

    {
        "Arn": "arn:aws:cloudformation:us-west-2:123456789012:type/resource/Example-Test-Alias"
    }

For more information, see `Using the AWS CloudFormation registry <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/registry.html>`__ in the *AWS CloudFormation User Guide*.