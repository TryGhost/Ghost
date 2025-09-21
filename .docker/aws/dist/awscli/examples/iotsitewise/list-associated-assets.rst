**To list all assets associated to an asset in a specific hierarchy**

The following ``list-associated-assets`` example lists all wind turbine assets associated to the specified wind farm asset. ::

    aws iotsitewise list-associated-assets \
        --asset-id a1b2c3d4-5678-90ab-cdef-44444EXAMPLE \
        --hierarchy-id a1b2c3d4-5678-90ab-cdef-77777EXAMPLE

Output::

    {
        "assetSummaries": [
            {
                "id": "a1b2c3d4-5678-90ab-cdef-33333EXAMPLE",
                "arn": "arn:aws:iotsitewise:us-west-2:123456789012:asset/a1b2c3d4-5678-90ab-cdef-33333EXAMPLE",
                "name": "Wind Turbine 1",
                "assetModelId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "creationDate": 1575671550.0,
                "lastUpdateDate": 1575686308.0,
                "status": {
                    "state": "ACTIVE"
                },
                "hierarchies": []
            }
        ]
    }

For more information, see `Listing assets associated to a specific asset <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/discover-asset-resources.html#list-associated-assets>`__ in the *AWS IoT SiteWise User Guide*.