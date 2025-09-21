**To list tags assigned to a resource**

The following ``list-tags-for-resource`` example lists the tags (metadata) you have assigned to the resource. ::

    aws iotevents list-tags-for-resource \
        --resource-arn "arn:aws:iotevents:us-west-2:123456789012:input/PressureInput"

Output::

    {
        "tags": [
            {
                "value": "motor", 
                "key": "deviceType"
            }
        ]
    }

For more information, see `ListTagsForResource <https://docs.aws.amazon.com/iotevents/latest/developerguide/iotevents-commands.html#api-iotevents-ListTagsForResource>`__ in the *AWS IoT Events Developer Guide**.

