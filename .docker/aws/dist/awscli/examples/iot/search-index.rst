**To query the thing index**

The following ``search-index`` example queries the ``AWS_Things`` index for things that have a type of ``LightBulb``. ::

    aws iot search-index \
        --index-name "AWS_Things" \
        --query-string "thingTypeName:LightBulb"

Output::

    {
        "things": [
            {
                "thingName": "MyLightBulb",
                "thingId": "40da2e73-c6af-406e-b415-15acae538797",
                "thingTypeName": "LightBulb",
                "thingGroupNames": [
                    "LightBulbs",
                    "DeadBulbs"
                ],
                "attributes": {
                    "model": "123",
                    "wattage": "75"
                },
                "connectivity": {
                    "connected": false
                }
            },
            {
                "thingName": "ThirdBulb",
                "thingId": "615c8455-33d5-40e8-95fd-3ee8b24490af",
                "thingTypeName": "LightBulb",
                "attributes": {
                    "model": "123",
                    "wattage": "75"
                },
                "connectivity": {
                    "connected": false
                }
            },
            {
                "thingName": "MyOtherLightBulb",
                "thingId": "6dae0d3f-40c1-476a-80c4-1ed24ba6aa11",
                "thingTypeName": "LightBulb",
                "attributes": {
                    "model": "123",
                    "wattage": "75"
                },
                "connectivity": {
                    "connected": false
                }
            }
        ]
    }

For more information, see `Managing Thing Indexing <https://docs.aws.amazon.com/iot/latest/developerguide/managing-index.html>`__ in the *AWS IoT Developer Guide*.
