**Example 1: To list all top-level assets**

The following ``list-assets`` example lists all assets that are top-level in the asset hierarchy tree and defined in your AWS account in the current Region. ::

    aws iotsitewise list-assets \
        --filter TOP_LEVEL

Output::

    {
        "assetSummaries": [
            {
                "id": "a1b2c3d4-5678-90ab-cdef-44444EXAMPLE",
                "arn": "arn:aws:iotsitewise:us-west-2:123456789012:asset/a1b2c3d4-5678-90ab-cdef-44444EXAMPLE",
                "name": "Wind Farm 1",
                "assetModelId": "a1b2c3d4-5678-90ab-cdef-22222EXAMPLE",
                "creationDate": 1575672453.0,
                "lastUpdateDate": 1575672453.0,
                "status": {
                    "state": "ACTIVE"
                },
                "hierarchies": [
                    {
                        "id": "a1b2c3d4-5678-90ab-cdef-77777EXAMPLE",
                        "name": "Wind Turbines"
                    }
                ]
            }
        ]
    }

For more information, see `Listing assets <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/discover-asset-resources.html#list-assets>`__ in the *AWS IoT SiteWise User Guide*.

**Example 2: To list all assets based on an asset model**

The following ``list-assets`` example lists all assets based on an asset model and defined in your AWS account in the current Region. ::

    aws iotsitewise list-assets \
        --asset-model-id a1b2c3d4-5678-90ab-cdef-11111EXAMPLE

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

For more information, see `Listing assets <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/discover-asset-resources.html#list-assets>`__ in the *AWS IoT SiteWise User Guide*.