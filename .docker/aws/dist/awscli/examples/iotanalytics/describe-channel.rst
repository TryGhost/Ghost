**To retrieve information about a channel**

The following ``describe-channel`` example displays details, including statistics, for the specified channel. ::

    aws iotanalytics describe-channel \
        --channel-name mychannel \
        --include-statistics

Output::

    {
        "statistics": {
            "size": {
                "estimatedSizeInBytes": 402.0,
                "estimatedOn": 1561504380.0
            }
        },
        "channel": {
            "status": "ACTIVE",
            "name": "mychannel",
            "lastUpdateTime": 1557860351.001,
            "creationTime": 1557860351.001,
            "retentionPeriod": {
                "unlimited": true
            },
            "arn": "arn:aws:iotanalytics:us-west-2:123456789012:channel/mychannel"
        }
    }

For more information, see `DescribeChannel <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_DescribeChannel.html>`__ in the *AWS IoT Analytics API Reference*.
