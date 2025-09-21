**To list the thing groups defined in your AWS account**

The following ``describe-thing-group`` example lists all thing groups defined in your AWS account. ::

    aws iot list-thing-groups

Output::

    {
        "thingGroups": [
            {
                "groupName": "HalogenBulbs",
                "groupArn": "arn:aws:iot:us-west-2:123456789012:thinggroup/HalogenBulbs"
            },
            {
                "groupName": "LightBulbs",
                "groupArn": "arn:aws:iot:us-west-2:123456789012:thinggroup/LightBulbs"
            }
        ]
    }

For more information, see `Thing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/thing-groups.html>`__ in the *AWS IoT Developers Guide*.

