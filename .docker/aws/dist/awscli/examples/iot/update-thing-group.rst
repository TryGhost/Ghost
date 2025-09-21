**To update the definition for a thing group**

The following ``update-thing-group`` example updates the definition for the specified thing group, changing the description and two attributes. ::

    aws iot update-thing-group \
        --thing-group-name HalogenBulbs \
        --thing-group-properties "thingGroupDescription=\"Halogen bulb group\", attributePayload={attributes={Manufacturer=AnyCompany,wattage=60}}"

Output::

    {
        "version": 2
    }

For more information, see `Thing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/thing-groups.html>`__ in the *AWS IoT Developers Guide*.

