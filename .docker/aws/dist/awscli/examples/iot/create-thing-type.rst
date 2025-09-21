**To define a thing type**

The following ``create-thing-type`` example defines a thing type and associated attributes. ::

    aws iot create-thing-type \
        --thing-type-name "LightBulb" \
        --thing-type-properties "thingTypeDescription=light bulb type, searchableAttributes=wattage,model"

Output::

    {
        "thingTypeName": "LightBulb",
        "thingTypeArn": "arn:aws:iot:us-west-2:123456789012:thingtype/LightBulb",
        "thingTypeId": "ce3573b0-0a3c-45a7-ac93-4e0ce14cd190"
    }

For more information, see `Thing Types <https://docs.aws.amazon.com/iot/latest/developerguide/thing-types.html>`__ in the *AWS IoT Developers Guide*.
