**To remove tags from a resource**

The following ``untag-resource`` example removes the specified tags from the resource. ::

    aws iotevents untag-resource \
        --cli-input-json file://pressureInput.untag.json


Contents of ``pressureInput.untag.json``::

    {
        "resourceArn": "arn:aws:iotevents:us-west-2:123456789012:input/PressureInput", 
        "tagKeys": [
                "deviceType"
        ]
    }

This command produces no output.

For more information, see `UntagResource <https://docs.aws.amazon.com/iotevents/latest/developerguide/iotevents-commands.html#api-iotevents-UntagResource>`__ in the *AWS IoT Events Developer Guide**.

