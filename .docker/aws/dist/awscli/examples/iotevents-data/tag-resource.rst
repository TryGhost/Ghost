**To add tags to a resource**

The following ``tag-resource`` example adds to or modifies the tags of the given resource. Tags are metadata that can be used to manage a resource. ::

    aws iotevents tag-resource \
        --cli-input-json file://pressureInput.tag.json


Contents of ``pressureInput.tag.json``::

    {
        "resourceArn": "arn:aws:iotevents:us-west-2:123456789012:input/PressureInput", 
        "tags": [
            {
                "key": "deviceType",
                "value": "motor"
            }
        ]
    }

This command produces no output.

For more information, see `TagResource <https://docs.aws.amazon.com/iotevents/latest/developerguide/iotevents-commands.html#api-iotevents-TagResource>`__ in the *AWS IoT Events Developer Guide**.

