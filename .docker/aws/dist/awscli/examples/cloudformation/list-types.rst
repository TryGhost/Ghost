**To list the private resource types in an account**

The following ``list-types`` example displays a list of the private resource types currently registered in the current AWS account. ::

    aws cloudformation list-types

Output::

    {
        "TypeSummaries": [
            {
                "Description": "WordPress blog resource for internal use",
                "LastUpdated": "2019-12-04T18:28:15.059Z",
                "TypeName": "My::WordPress::BlogExample",
                "TypeArn": "arn:aws:cloudformation:us-west-2:123456789012:type/resource/My-WordPress-BlogExample",
                "DefaultVersionId": "00000005",
                "Type": "RESOURCE"
            },
            {
                "Description": "Customized resource derived from AWS::Logs::LogGroup",
                "LastUpdated": "2019-12-04T18:28:15.059Z",
                "TypeName": "My::Logs::LogGroup",
                "TypeArn": "arn:aws:cloudformation:us-west-2:123456789012:type/resource/My-Logs-LogGroup",
                "DefaultVersionId": "00000003",
                "Type": "RESOURCE"
            }
        ]
    }

For more information, see `Using the CloudFormation Registry <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/registry.html>`__ in the *AWS CloudFormation Users Guide*.
