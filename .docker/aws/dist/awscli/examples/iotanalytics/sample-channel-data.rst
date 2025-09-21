**To retrieve sample messages from a channel**

The following ``sample-channel-data`` example retrieves a sample of messages from the specified channel ingested during the specified timeframe. You can retrieve up to 10 messages. ::

    aws iotanalytics sample-channel-data \
        --channel-name mychannel

Output::

    {
        "payloads": [
            "eyAidGVtcGVyYXR1cmUiOiAyMCB9",
            "eyAiZm9vIjogImJhciIgfQ=="
        ]
    }

For more information, see `SampleChannelData <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_SampleChannelData.html>`__ in the *AWS IoT Analytics API Reference*.
