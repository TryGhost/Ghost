**To list all gateways**

The following ``list-gateways`` example lists all gateways that are defined in your AWS account in the current Region. ::

    aws iotsitewise list-gateways

Output::

    {
        "gatewaySummaries": [
            {
                "gatewayId": "a1b2c3d4-5678-90ab-cdef-1a1a1EXAMPLE",
                "gatewayName": "ExampleCorpGateway",
                "gatewayCapabilitySummaries": [
                    {
                        "capabilityNamespace": "iotsitewise:opcuacollector:1",
                        "capabilitySyncStatus": "IN_SYNC"
                    }
                ],
                "creationDate": 1588369971.457,
                "lastUpdateDate": 1588369971.457
            }
        ]
    }

For more information, see `Ingesting data using a gateway <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/gateways.html>`__ in the *AWS IoT SiteWise User Guide*.