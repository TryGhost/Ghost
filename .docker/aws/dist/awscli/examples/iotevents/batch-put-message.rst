**To send messages (inputs) to AWS IoT Events**

The following ``batch-put-message`` example sends a set of messages to the AWS IoT Events system. Each message payload is transformed into the input you specify ( ``inputName`` ) and ingested into any detectors that monitor that input. If multiple messages are sent, the order in which the messages are processed isn't guaranteed. To guarantee ordering, you must send messages one at a time and wait for a successful response. ::

    aws iotevents-data batch-put-message \
        --cli-input-json file://highPressureMessage.json

Contents of ``highPressureMessage.json``::

    {
        "messages": [
            {
                "messageId": "00001",
                "inputName": "PressureInput",
                "payload": "{\"motorid\": \"Fulton-A32\", \"sensorData\": {\"pressure\": 80, \"temperature\": 39} }"
            }
        ]
    }
  
Output::

    {
        "BatchPutMessageErrorEntries": []
    }

For more information, see `BatchPutMessage <https://docs.aws.amazon.com/iotevents/latest/apireference/API_iotevents-data_BatchPutMessage.html>`__ in the *AWS IoT Events API Reference*.
