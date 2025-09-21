**To list all asset models**

The following ``list-asset-models`` example lists all asset models that are defined in your AWS account in the current Region. ::

    aws iotsitewise list-asset-models

Output::

    {
        "assetModelSummaries": [
            {
                "id": "a1b2c3d4-5678-90ab-cdef-22222EXAMPLE",
                "arn": "arn:aws:iotsitewise:us-west-2:123456789012:asset-model/a1b2c3d4-5678-90ab-cdef-22222EXAMPLE",
                "name": "Wind Farm Model",
                "description": "Represents a wind farm that comprises many wind turbines",
                "creationDate": 1575671284.0,
                "lastUpdateDate": 1575671988.0,
                "status": {
                    "state": "ACTIVE"
                }
            },
            {
                "id": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "arn": "arn:aws:iotsitewise:us-west-2:123456789012:asset-model/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "name": "Wind Turbine Model",
                "description": "Represents a wind turbine manufactured by Example Corp",
                "creationDate": 1575671207.0,
                "lastUpdateDate": 1575686273.0,
                "status": {
                    "state": "ACTIVE"
                }
            }
        ]
    }

For more information, see `Listing all asset models <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/discover-asset-resources.html#list-asset-models>`__ in the *AWS IoT SiteWise User Guide*.