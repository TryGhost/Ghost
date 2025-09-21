**To get information about a thing group**

The following ``describe-thing-group`` example gets information about the thing group named ``HalogenBulbs``. ::

    aws iot describe-thing-group \
        --thing-group-name HalogenBulbs

Output::

    {
        "thingGroupName": "HalogenBulbs",
        "thingGroupId": "f4ec6b84-b42b-499d-9ce1-4dbd4d4f6f6e",
        "thingGroupArn": "arn:aws:iot:us-west-2:123456789012:thinggroup/HalogenBulbs",
        "version": 1,
        "thingGroupProperties": {},
        "thingGroupMetadata": {
            "parentGroupName": "LightBulbs",
            "rootToParentThingGroups": [
                {
                    "groupName": "LightBulbs",
                    "groupArn": "arn:aws:iot:us-west-2:123456789012:thinggroup/LightBulbs"
                }
            ],
            "creationDate": 1559927609.897
        }
    }

For more information, see `Thing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/thing-groups.html>`__ in the *AWS IoT Developers Guide*.

