**To send data to asset properties**

The following ``batch-put-asset-property-value`` example sends power and temperature data to the asset properties identified by property aliases. ::

    aws iotsitewise batch-put-asset-property-value \
        --cli-input-json file://batch-put-asset-property-value.json

Contents of ``batch-put-asset-property-value.json``::

    {
        "entries": [
            {
                "entryId": "1575691200-company-windfarm-3-turbine-7-power",
                "propertyAlias": "company-windfarm-3-turbine-7-power",
                "propertyValues": [
                    {
                        "value": {
                            "doubleValue": 4.92
                        },
                        "timestamp": {
                            "timeInSeconds": 1575691200
                        },
                        "quality": "GOOD"
                    }
                ]
            },
            {
                "entryId": "1575691200-company-windfarm-3-turbine-7-temperature",
                "propertyAlias": "company-windfarm-3-turbine-7-temperature",
                "propertyValues": [
                    {
                        "value": {
                            "integerValue": 38
                        },
                        "timestamp": {
                            "timeInSeconds": 1575691200
                        }
                    }
                ]
            }
        ]
    }

Output::

    {
        "errorEntries": []
    }

For more information, see `Ingesting data using the AWS IoT SiteWise API <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/ingest-api.html>`__ in the *AWS IoT SiteWise User Guide*.