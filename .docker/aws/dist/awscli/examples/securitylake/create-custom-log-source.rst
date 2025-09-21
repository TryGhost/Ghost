**To add a custom source as an Amazon Security Lake source**

The following ``create-custom-logsource`` example adds a custom source as a Security Lake source in the designated log provider account and the designated Region. ::

    aws securitylake create-custom-log-source \
        --source-name "VPC_FLOW" \
        --event-classes '["DNS_ACTIVITY", "NETWORK_ACTIVITY"]' \
        --configuration '{"crawlerConfiguration": {"roleArn": "arn:aws:glue:eu-west-2:123456789012:crawler/E1WG1ZNPRXT0D4"},"providerIdentity": {"principal": "029189416600","externalId": "123456789012"}}' --region "us-east-1"

Output::

    {
        "customLogSource": {
            "attributes": {
                "crawlerArn": "arn:aws:glue:eu-west-2:123456789012:crawler/E1WG1ZNPRXT0D4",
                "databaseArn": "arn:aws:glue:eu-west-2:123456789012:database/E1WG1ZNPRXT0D4",
                "tableArn": "arn:aws:glue:eu-west-2:123456789012:table/E1WG1ZNPRXT0D4"
            },
            "provider": {
                "location": "amzn-s3-demo-bucket--usw2-az1--x-s3",
                "roleArn": "arn:aws:iam::123456789012:role/AmazonSecurityLake-Provider-testCustom2-eu-west-2"
            },
            "sourceName": "testCustom2"
            "sourceVersion": "2.0"
        }
    }

For more information, see `Adding a custom source <https://docs.aws.amazon.com/security-lake/latest/userguide/custom-sources.html#adding-custom-sources>`__ in the *Amazon Security Lake User Guide*.