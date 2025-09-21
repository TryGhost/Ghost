**To get information about a thing type**

The following ``describe-thing-type`` example display information about the specified thing type defined in your AWS account. ::

    aws iot describe-thing-type \
        --thing-type-name "LightBulb"

Output::

    {
        "thingTypeName": "LightBulb",
        "thingTypeId": "ce3573b0-0a3c-45a7-ac93-4e0ce14cd190",
        "thingTypeArn": "arn:aws:iot:us-west-2:123456789012:thingtype/LightBulb",
        "thingTypeProperties": {
            "thingTypeDescription": "light bulb type",
            "searchableAttributes": [
                "model",
                "wattage"
            ]
        },
        "thingTypeMetadata": {
            "deprecated": false,
            "creationDate": 1559772562.498
        }
    }

For more information, see `Thing Types <https://docs.aws.amazon.com/iot/latest/developerguide/thing-types.html>`__ in the *AWS IoT Developers Guide*.
