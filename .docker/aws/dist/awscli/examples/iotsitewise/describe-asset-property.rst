**To describe an asset property**

The following ``describe-asset-property`` example describes a wind farm asset's total generated power property. ::

    aws iotsitewise describe-asset-property \
        --asset-id a1b2c3d4-5678-90ab-cdef-44444EXAMPLE \
        --property-id a1b2c3d4-5678-90ab-cdef-99999EXAMPLE

Output::

    {
        "assetId": "a1b2c3d4-5678-90ab-cdef-44444EXAMPLE",
        "assetName": "Wind Farm 1",
        "assetModelId": "a1b2c3d4-5678-90ab-cdef-22222EXAMPLE",
        "assetProperty": {
            "id": "a1b2c3d4-5678-90ab-cdef-99999EXAMPLE",
            "name": "Total Generated Power",
            "notification": {
                "topic": "$aws/sitewise/asset-models/a1b2c3d4-5678-90ab-cdef-22222EXAMPLE/assets/a1b2c3d4-5678-90ab-cdef-44444EXAMPLE/properties/a1b2c3d4-5678-90ab-cdef-99999EXAMPLE",
                "state": "DISABLED"
            },
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
        }
    }

For more information, see `Describing a specific asset property <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/discover-asset-resources.html#describe-asset-property>`__ in the *AWS IoT SiteWise User Guide*.