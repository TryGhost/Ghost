**To describe an asset model**

The following ``describe-asset-model`` example describes a wind farm asset model. ::

    aws iotsitewise describe-asset-model \
        --asset-model-id a1b2c3d4-5678-90ab-cdef-22222EXAMPLE

Output::

    {
        "assetModelId": "a1b2c3d4-5678-90ab-cdef-22222EXAMPLE",
        "assetModelArn": "arn:aws:iotsitewise:us-west-2:123456789012:asset-model/a1b2c3d4-5678-90ab-cdef-22222EXAMPLE",
        "assetModelName": "Wind Farm Model",
        "assetModelDescription": "Represents a wind farm that comprises many wind turbines",
        "assetModelProperties": [
            {
                "id": "a1b2c3d4-5678-90ab-cdef-99999EXAMPLE",
                "name": "Total Generated Power",
                "dataType": "DOUBLE",
                "unit": "kW",
                "type": {
                    "metric": {
                        "expression": "sum(power)",
                        "variables": [
                            {
                                "name": "power",
                                "value": {
                                    "propertyId": "a1b2c3d4-5678-90ab-cdef-66666EXAMPLE",
                                    "hierarchyId": "a1b2c3d4-5678-90ab-cdef-77777EXAMPLE"
                                }
                            }
                        ],
                        "window": {
                            "tumbling": {
                                "interval": "1h"
                            }
                        }
                    }
                }
            },
            {
                "id": "a1b2c3d4-5678-90ab-cdef-88888EXAMPLE",
                "name": "Region",
                "dataType": "STRING",
                "type": {
                    "attribute": {
                        "defaultValue": " "
                    }
                }
            }
        ],
        "assetModelHierarchies": [
            {
                "id": "a1b2c3d4-5678-90ab-cdef-77777EXAMPLE",
                "name": "Wind Turbines",
                "childAssetModelId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE"
            }
        ],
        "assetModelCreationDate": 1575671284.0,
        "assetModelLastUpdateDate": 1575671988.0,
        "assetModelStatus": {
            "state": "ACTIVE"
        }
    }

For more information, see `Describing a specific asset model <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/discover-asset-resources.html#describe-asset-model>`__ in the *AWS IoT SiteWise User Guide*.