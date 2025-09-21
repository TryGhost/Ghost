**To update an asset model**

The following ``update-asset-model`` example updates a wind farm asset model's description. This example includes the model's existing IDs and definitions, because ``update-asset-model`` overwrites the existing model with the new model. ::

    aws iotsitewise update-asset-model \
        --cli-input-json file://update-wind-farm-model.json

Contents of ``update-wind-farm-model.json``::

    {
        "assetModelName": "Wind Farm Model",
        "assetModelDescription": "Represents a wind farm that comprises many wind turbines",
        "assetModelProperties": [
            {
                "id": "a1b2c3d4-5678-90ab-cdef-88888EXAMPLE",
                "name": "Region",
                "dataType": "STRING",
                "type": {
                    "attribute": {}
                }
            },
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
                                    "hierarchyId": "a1b2c3d4-5678-90ab-cdef-77777EXAMPLE",
                                    "propertyId": "a1b2c3d4-5678-90ab-cdef-66666EXAMPLE"
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
            }
        ],
        "assetModelHierarchies": [
            {
                "id": "a1b2c3d4-5678-90ab-cdef-77777EXAMPLE",
                "name": "Wind Turbines",
                "childAssetModelId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE"
            }
        ]
    }

Output::

    {
        "assetModelId": "a1b2c3d4-5678-90ab-cdef-22222EXAMPLE",
        "assetModelArn": "arn:aws:iotsitewise:us-west-2:123456789012:asset-model/a1b2c3d4-5678-90ab-cdef-22222EXAMPLE",
        "assetModelStatus": {
            "state": "CREATING"
        }
    }

For more information, see `Updating asset models <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/update-assets-and-models.html#update-asset-models>`__ in the *AWS IoT SiteWise User Guide*.