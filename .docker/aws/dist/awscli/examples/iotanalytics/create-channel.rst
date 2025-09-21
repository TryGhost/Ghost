**To create a channel**

The following ``create-channel`` example creates a channel with the specified configuration. A channel collects data from an MQTT topic and archives the raw, unprocessed messages before publishing the data to a pipeline. ::

    aws iotanalytics create-channel \
        --cli-input-json file://create-channel.json

Contents of ``create-channel.json``::

    {
        "channelName": "mychannel",
        "retentionPeriod": {
            "unlimited": true
        },
        "tags": [
            {
                "key": "Environment",
                "value": "Production"
            }
        ]
    }

Output::

    {
        "channelArn": "arn:aws:iotanalytics:us-west-2:123456789012:channel/mychannel",
        "channelName": "mychannel",
        "retentionPeriod": {
            "unlimited": true
        }
    }

For more information, see `CreateChannel <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_CreateChannel.html>`__ in the *AWS IoT Analytics API Reference*.
