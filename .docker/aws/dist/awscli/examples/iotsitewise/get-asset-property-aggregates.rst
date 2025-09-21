**To retrieve an asset property's aggregated average and count values**

The following ``get-asset-property-aggregates`` example retrieves a wind turbine asset's average total power and count of total power data points for a 1 hour period in time. ::

    aws iotsitewise get-asset-property-aggregates \
        --asset-id a1b2c3d4-5678-90ab-cdef-33333EXAMPLE \
        --property-id a1b2c3d4-5678-90ab-cdef-66666EXAMPLE \
        --start-date 1580849400 \
        --end-date 1580853000 \
        --aggregate-types AVERAGE COUNT \
        --resolution 1h

Output::

    {
        "aggregatedValues": [
            {
                "timestamp": 1580850000.0,
                "quality": "GOOD",
                "value": {
                    "average": 8723.46538886233,
                    "count": 12.0
                }
            }
        ]
    }

For more information, see `Querying asset property aggregates <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/query-industrial-data.html#aggregates>`__ in the *AWS IoT SiteWise User Guide*.