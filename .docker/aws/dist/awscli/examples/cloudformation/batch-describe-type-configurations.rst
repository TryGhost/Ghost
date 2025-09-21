**To batch describe a type configuration**

The following ``batch-describe-type-configurations`` example configures the data for the type. ::

    aws cloudformation batch-describe-type-configurations \
        --region us-west-2 \
        --type-configuration-identifiers TypeArn="arn:aws:cloudformation:us-west-2:123456789012:type/resource/Example-Test-Type,TypeConfigurationAlias=MyConfiguration"

Output::

    {
        "Errors": [],
        "UnprocessedTypeConfigurations": [],
        "TypeConfigurations": [
            {
                "Arn": "arn:aws:cloudformation:us-west-2:123456789012:type/resource/Example-Test-Type",
                "Alias": "MyConfiguration",
                "Configuration": "{\n        \"Example\": {\n            \"ApiKey\": \"examplekey\",\n            \"ApplicationKey\": \"examplekey1\",\n            \"ApiURL\": \"exampleurl\"\n            }\n}",
                "LastUpdated": "2021-10-01T15:25:46.210000+00:00",
                "TypeArn": "arn:aws:cloudformation:us-east-1:123456789012:type/resource/Example-Test-Type"
            }
        ]
    }

For more information, see `Using the AWS CloudFormation registry <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/registry.html>`__ in the *AWS CloudFormation User Guide*.