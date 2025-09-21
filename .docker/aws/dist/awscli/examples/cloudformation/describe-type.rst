**To display type information**

The following ``describe-type`` example displays information for the specified type. ::

    aws cloudformation describe-type \
        --type-name My::Logs::LogGroup \
        --type RESOURCE

Output::

    {
        "SourceUrl": "https://github.com/aws-cloudformation/aws-cloudformation-resource-providers-logs.git",
        "Description": "Customized resource derived from AWS::Logs::LogGroup",
        "TimeCreated": "2019-12-03T23:29:33.321Z",
        "Visibility": "PRIVATE",
        "TypeName": "My::Logs::LogGroup",
        "LastUpdated": "2019-12-03T23:29:33.321Z",
        "DeprecatedStatus": "LIVE",
        "ProvisioningType": "FULLY_MUTABLE",
        "Type": "RESOURCE",
        "Arn": "arn:aws:cloudformation:us-west-2:123456789012:type/resource/My-Logs-LogGroup/00000001",
        "Schema": "[details omitted]"
    }

For more information, see `Using the CloudFormation Registry <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/registry.html>`__ in the *AWS CloudFormation Users Guide*.
