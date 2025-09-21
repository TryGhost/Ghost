**To send a message to a channel**

The following ``batch-put-message`` example sends a message to the specified channel. ::

    aws iotanalytics batch-put-message \
        --cli-binary-format raw-in-base64-out \
        --cli-input-json file://batch-put-message.json

Contents of ``batch-put-message.json``::

    {
        "channelName": "mychannel",
        "messages": [
            {
                "messageId": "0001",
                "payload": "eyAidGVtcGVyYXR1cmUiOiAyMCB9"
            }
        ]
    }

Output::

    {
        "batchPutMessageErrorEntries": []
    }

For more information, see `BatchPutMessage <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_BatchPutMessage.html>`__ in the *AWS IoT Analytics API Reference*.
