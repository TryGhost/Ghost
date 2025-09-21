**To list the defined thing types**

The following ``list-thing-types`` example displays a list of thing types defined in your AWS account. ::

    aws iot list-thing-types

Output::

    {
        "thingTypes": [
            {
                "thingTypeName": "LightBulb",
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
        ]
    }

For more information, see `Thing Types <https://docs.aws.amazon.com/iot/latest/developerguide/thing-types.html>`__ in the *AWS IoT Developers Guide*.
