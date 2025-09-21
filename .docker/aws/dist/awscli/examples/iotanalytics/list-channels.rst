**To retrieve a list of channels**

The following ``list-channels`` example displays summary information for the available channels. ::

    aws iotanalytics list-channels

Output::

    {
        "channelSummaries": [
            {
                "status": "ACTIVE",
                "channelName": "mychannel",
                "creationTime": 1557860351.001,
                "lastUpdateTime": 1557860351.001
            }
        ]
    }

For more information, see `ListChannels <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_ListChannels.html>`__ in the *AWS IoT Analytics API Reference*.
