**To retrieve the telemetry configurations for the account**

The following ``list-resource-telemetry`` example returns a list of telemetry configurations for AWS resources supported by telemetry config in the specified account. ::

    aws observabilityadmin list-resource-telemetry \
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
                "ResourceIdentifier": "i-0e979d278b040f856",
                "ResourceTags": {
                    "Name": "apache"
                },
                "LastUpdateTimeStamp": 1732744260182
            }
        ]
    }

For more information, see `Auditing CloudWatch telemetry configurations <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/telemetry-config-cloudwatch.html>`__ in the *Amazon CloudWatch User Guide*.