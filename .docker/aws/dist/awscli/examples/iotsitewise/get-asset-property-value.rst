**To retrieve an asset property's current value**

The following ``get-asset-property-value`` example retrieves a wind turbine asset's current total power. ::

    aws iotsitewise get-asset-property-value \
        --asset-id a1b2c3d4-5678-90ab-cdef-33333EXAMPLE \
        --property-id a1b2c3d4-5678-90ab-cdef-66666EXAMPLE

Output::

    {
        "propertyValue": {
            "value": {
                "doubleValue": 6890.8677520453875
            },
            "timestamp": {
                "timeInSeconds": 1580853000,
                "offsetInNanos": 0
            },
            "quality": "GOOD"
        }
    }

For more information, see `Querying current asset property values <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/query-industrial-data.html#current-values>`__ in the *AWS IoT SiteWise User Guide*.