**To describe a gateway**

The following ``describe-gateway`` example describes a gateway. ::

    aws iotsitewise describe-gateway \
        --gateway-id a1b2c3d4-5678-90ab-cdef-1a1a1EXAMPLE

Output::

    {
        "gatewayId": "a1b2c3d4-5678-90ab-cdef-1a1a1EXAMPLE",
        "gatewayName": "ExampleCorpGateway",
        "gatewayArn": "arn:aws:iotsitewise:us-west-2:123456789012:gateway/a1b2c3d4-5678-90ab-cdef-1a1a1EXAMPLE",
        "gatewayPlatform": {
            "greengrass": {
                "groupArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/a1b2c3d4-5678-90ab-cdef-1b1b1EXAMPLE"
            }
        },
        "gatewayCapabilitySummaries": [
            {
                "capabilityNamespace": "iotsitewise:opcuacollector:1",
                "capabilitySyncStatus": "IN_SYNC"
            }
        ],
        "creationDate": 1588369971.457,
        "lastUpdateDate": 1588369971.457
    }

For more information, see `Ingesting data using a gateway <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/gateways.html>`__ in the *AWS IoT SiteWise User Guide*.