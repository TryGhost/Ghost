**To create an asset model**

The following ``create-asset-model`` example creates an asset model that defines a wind turbine with the following properties:

- Serial number - The serial number of a wind turbine
- Generated power - The generated power data stream from a wind turbine
- Temperature C - The temperature data stream from a wind turbine in Celsius
- Temperature F - The mapped temperature data points from Celsius to Fahrenheit

::

    aws iotsitewise create-asset-model \
        --cli-input-json file://create-wind-turbine-model.json

Contents of ``create-wind-turbine-model.json``::

    {
        "assetModelName": "Wind Turbine Model",
        "assetModelDescription": "Represents a wind turbine",
        "assetModelProperties": [
            {
                "name": "Serial Number",
                "dataType": "STRING",
                "type": {
                    "attribute": {}
                }
            },
            {
                "name": "Generated Power",
                "dataType": "DOUBLE",
                "unit": "kW",
                "type": {
                    "measurement": {}
                }
            },
            {
                "name": "Temperature C",
                "dataType": "DOUBLE",
                "unit": "Celsius",
                "type": {
                    "measurement": {}
                }
            },
            {
                "name": "Temperature F",
                "dataType": "DOUBLE",
                "unit": "Fahrenheit",
                "type": {
                    "transform": {
                        "expression": "temp_c * 9 / 5 + 32",
                        "variables": [
                            {
                                "name": "temp_c",
                                "value": {
                                    "propertyId": "Temperature C"
                                }
                            }
                        ]
                    }
                }
            },
            {
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
                                    "propertyId": "Generated Power"
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
        ]
    }

Output::

    {
        "assetModelId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
        "assetModelArn": "arn:aws:iotsitewise:us-west-2:123456789012:asset-model/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
        "assetModelStatus": {
            "state": "CREATING"
        }
    }

For more information, see `Defining asset models <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/define-models.html>`__ in the *AWS IoT SiteWise User Guide*.