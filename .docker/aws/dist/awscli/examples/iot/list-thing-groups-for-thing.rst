**To list the groups that a thing belongs to**

The following ``list-thing-groups-for-thing`` example lists the groups to which the specified thing belongs. ::

    aws iot list-thing-groups-for-thing \
        --thing-name MyLightBulb

Output::

    {
        "thingGroups": [
            {
                "groupName": "DeadBulbs",
                "groupArn": "arn:aws:iot:us-west-2:123456789012:thinggroup/DeadBulbs"
            },
            {
                "groupName": "LightBulbs",
                "groupArn": "arn:aws:iot:us-west-2:123456789012:thinggroup/LightBulbs"
            }
        ]
    }

For more information, see `Thing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/thing-groups.html>`__ in the *AWS IoT Developers Guide*.

