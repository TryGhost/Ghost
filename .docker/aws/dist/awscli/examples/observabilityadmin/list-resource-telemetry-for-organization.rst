**To retrieve the telemetry configurations for the organization**

The following ``list-resource-telemetry-for-organization`` example returns a list of telemetry configurations in the organization for AWS resources supported by telemetry config. ::

    aws observabilityadmin list-resource-telemetry-for-organization \
        --resource-types  AWS::EC2::Instance

Output::

    {
        "TelemetryConfigurations": [
            {
                "AccountIdentifier": "111111111111",
                "TelemetryConfigurationState": {
                    "Logs": "NotApplicable",
                    "Metrics": "Disabled",
                    "Traces": "NotApplicable"
                },
                "ResourceType": "AWS::EC2::Instance",
                "ResourceIdentifier": "i-a166400b",
                "ResourceTags": {
                    "Name": "dev"
                },
                "LastUpdateTimeStamp": 1733168548521
            },
            {
                "AccountIdentifier": "222222222222",
                "TelemetryConfigurationState": {
                    "Logs": "NotApplicable",
                    "Metrics": "Disabled",
                    "Traces": "NotApplicable"
                },
                "ResourceType": "AWS::EC2::Instance",
                "ResourceIdentifier": "i-b188560f",
                "ResourceTags": {
                    "Name": "apache"
                },
                "LastUpdateTimeStamp": 1732744260182
            }
        ]
    }

For more information, see `Auditing CloudWatch telemetry configurations <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/telemetry-config-cloudwatch.html>`__ in the *Amazon CloudWatch User Guide*.