**To describe an asset**

The following ``describe-asset`` example describes a wind farm asset. ::

    aws iotsitewise describe-asset \
        --asset-id a1b2c3d4-5678-90ab-cdef-44444EXAMPLE

Output::

    {
        "assetId": "a1b2c3d4-5678-90ab-cdef-44444EXAMPLE",
        "assetArn": "arn:aws:iotsitewise:us-west-2:123456789012:asset/a1b2c3d4-5678-90ab-cdef-44444EXAMPLE",
        "assetName": "Wind Farm 1",
        "assetModelId": "a1b2c3d4-5678-90ab-cdef-22222EXAMPLE",
        "assetProperties": [
            {
                "id": "a1b2c3d4-5678-90ab-cdef-88888EXAMPLE",
                "name": "Region",
                "dataType": "STRING"
            },
            {
                "id": "a1b2c3d4-5678-90ab-cdef-99999EXAMPLE",
                "name": "Total Generated Power",
                "dataType": "DOUBLE",
                "unit": "kW"
            }
        ],
        "assetHierarchies": [
            {
                "id": "a1b2c3d4-5678-90ab-cdef-77777EXAMPLE",
                "name": "Wind Turbines"
            }
        ],
        "assetCreationDate": 1575672453.0,
        "assetLastUpdateDate": 1575672453.0,
        "assetStatus": {
            "state": "ACTIVE"
        }
    }

For more information, see `Describing a specific asset <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/discover-asset-resources.html#describe-asset>`__ in the *AWS IoT SiteWise User Guide*.