**To modify a channel**

The following ``update-channel`` example modifies the settings for the specified channel. ::

    aws iotanalytics update-channel \
        --cli-input-json file://update-channel.json

Contents of ``update-channel.json``::

    {
        "channelName": "mychannel",
        "retentionPeriod": {
            "numberOfDays": 92
        }
    }

This command produces no output.

For more information, see `UpdateChannel <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_UpdateChannel.html>`__ in the *AWS IoT Analytics API Reference*.
