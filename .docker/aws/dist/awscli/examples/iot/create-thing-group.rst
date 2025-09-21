**Example 1: To create a thing group**

The following ``create-thing-group`` example creates a thing group named ``LightBulbs`` with a description and two attributes. ::

    aws iot create-thing-group \
        --thing-group-name LightBulbs \
        --thing-group-properties "thingGroupDescription=\"Generic bulb group\", attributePayload={attributes={Manufacturer=AnyCompany,wattage=60}}"

Output::

    {
        "thingGroupName": "LightBulbs",
        "thingGroupArn": "arn:aws:iot:us-west-2:123456789012:thinggroup/LightBulbs",
        "thingGroupId": "9198bf9f-1e76-4a88-8e8c-e7140142c331"
    }

**Example 2: To create a thing group that's part of a parent group**

The following ``create-thing-group`` creates a thing group named ``HalogenBulbs`` that has a parent thing group named ``LightBulbs``. ::

    aws iot create-thing-group \
        --thing-group-name HalogenBulbs \
        --parent-group-name LightBulbs

Output::

    {
        "thingGroupName": "HalogenBulbs",
        "thingGroupArn": "arn:aws:iot:us-west-2:123456789012:thinggroup/HalogenBulbs",
        "thingGroupId": "f4ec6b84-b42b-499d-9ce1-4dbd4d4f6f6e"
    }

For more information, see `Thing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/thing-groups.html>`__ in the *AWS IoT Developers Guide*.
