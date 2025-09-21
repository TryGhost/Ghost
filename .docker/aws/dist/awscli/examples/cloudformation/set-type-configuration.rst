**To configure data**

The following ``set-type-configuration`` example specifies the configuration data for a registered CloudFormation extension, in the given account and Region. ::

    aws cloudformation set-type-configuration \
        --region us-west-2 \
        --type RESOURCE \
        --type-name Example::Test::Type \
        --configuration-alias default \
        --configuration "{\"CredentialKey\": \"testUserCredential\"}"

Output::

    {
        "ConfigurationArn": "arn:aws:cloudformation:us-west-2:123456789012:type-configuration/resource/Example-Test-Type/default"
    }

For more information, see `Using the AWS CloudFormation registry <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/registry.html>`__ in the *AWS CloudFormation User Guide*.