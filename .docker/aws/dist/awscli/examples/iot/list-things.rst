**Example 1: To list all things in the registry**

The following ``list-things`` example lists the things (devices) that are defined in the AWS IoT registry for your AWS account. ::

    aws iot list-things

Output::

    {
        "things": [
            {
                "thingName": "ThirdBulb",
                "thingTypeName": "LightBulb",
                "thingArn": "arn:aws:iot:us-west-2:123456789012:thing/ThirdBulb",
                "attributes": {
                    "model": "123",
                    "wattage": "75"
                },
                "version": 2
            },
            {
                "thingName": "MyOtherLightBulb",
                "thingTypeName": "LightBulb",
                "thingArn": "arn:aws:iot:us-west-2:123456789012:thing/MyOtherLightBulb",
                "attributes": {
                    "model": "123",
                    "wattage": "75"
                },
                "version": 3
            },
            {
                "thingName": "MyLightBulb",
                "thingTypeName": "LightBulb",
                "thingArn": "arn:aws:iot:us-west-2:123456789012:thing/MyLightBulb",
                "attributes": {
                    "model": "123",
                    "wattage": "75"
                },
                "version": 1
            },
            {
            "thingName": "SampleIoTThing",
            "thingArn": "arn:aws:iot:us-west-2:123456789012:thing/SampleIoTThing",
            "attributes": {},
            "version": 1
            }
        ]
    }

**Example 2: To list the defined things that have a specific attribute**

The following ``list-things`` example displays a list of things that have an attribute named ``wattage``. ::

    aws iot list-things \
        --attribute-name wattage

Output::

    {
        "things": [
            {
                "thingName": "MyLightBulb",
                "thingTypeName": "LightBulb",
                "thingArn": "arn:aws:iot:us-west-2:123456789012:thing/MyLightBulb",
                "attributes": {
                    "model": "123",
                    "wattage": "75"
                },
                "version": 1
            },
            {
                "thingName": "MyOtherLightBulb",
                "thingTypeName": "LightBulb",
                "thingArn": "arn:aws:iot:us-west-2:123456789012:thing/MyOtherLightBulb",
                "attributes": {
                    "model": "123",
                    "wattage": "75"
                },
                "version": 3
            }
        ]
    }

For more information, see `How to Manage Things with the Registry <https://docs.aws.amazon.com/iot/latest/developerguide/thing-registry.html>`__ in the *AWS IoT Developers Guide*.
