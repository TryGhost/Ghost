**To describe the logging configuration for a Verified Access instance**

The following ``describe-verified-access-instance-logging-configurations`` example describes the logging configuration for the specified Verified Access instance. ::

    aws ec2 describe-verified-access-instance-logging-configurations \
        --verified-access-instance-ids vai-0ce000c0b7643abea

Output::

    {
        "LoggingConfigurations": [
            {
                "VerifiedAccessInstanceId": "vai-0ce000c0b7643abea",
                "AccessLogs": {
                    "S3": {
                        "Enabled": false
                    },
                    "CloudWatchLogs": {
                        "Enabled": true,
                        "DeliveryStatus": {
                            "Code": "success"
                        },
                        "LogGroup": "my-log-group"
                    },
                    "KinesisDataFirehose": {
                        "Enabled": false
                    },
                    "LogVersion": "ocsf-1.0.0-rc.2",
                    "IncludeTrustContext": false
                }
            }
        ]
    }

For more information, see `Verified Access logs <https://docs.aws.amazon.com/verified-access/latest/ug/access-logs.html>`__ in the *AWS Verified Access User Guide*.
