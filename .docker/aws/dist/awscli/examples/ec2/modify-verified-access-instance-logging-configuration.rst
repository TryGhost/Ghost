**To enable logging for a Verified Access instance**

The following ``modify-verified-access-instance-logging-configuration`` example enables access logging for the specified Verified Access instance. The logs will be delivered to the specified CloudWatch Logs log group. ::

    aws ec2 modify-verified-access-instance-logging-configuration \
        --verified-access-instance-id vai-0ce000c0b7643abea \
        --access-logs CloudWatchLogs={Enabled=true,LogGroup=my-log-group}

Output::

    {
        "LoggingConfiguration": {
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
    }

For more information, see `Verified Access logs <https://docs.aws.amazon.com/verified-access/latest/ug/access-logs.html>`__ in the *AWS Verified Access User Guide*.
