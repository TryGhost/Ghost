**To retrieve an asset property's historical values**

The following ``get-asset-property-value-history`` example retrieves a wind turbine asset's total power values for a 20 minute period in time. ::

    aws iotsitewise get-asset-property-value-history \
        --asset-id a1b2c3d4-5678-90ab-cdef-33333EXAMPLE \
        --property-id a1b2c3d4-5678-90ab-cdef-66666EXAMPLE \
        --start-date 1580851800 \
        --end-date 1580853000

Output::

    {
        "assetPropertyValueHistory": [
            {
                "value": {
                    "doubleValue": 7217.787046814844
                },
                "timestamp": {
                    "timeInSeconds": 1580852100,
                    "offsetInNanos": 0
                },
                "quality": "GOOD"
            },
            {
                "value": {
                    "doubleValue": 6941.242811875451
                },
                "timestamp": {
                    "timeInSeconds": 1580852400,
                    "offsetInNanos": 0
                },
                "quality": "GOOD"
            },
            {
                "value": {
                    "doubleValue": 6976.797662266717
                },
                "timestamp": {
                    "timeInSeconds": 1580852700,
                    "offsetInNanos": 0
                },
                "quality": "GOOD"
            },
            {
                "value": {
                    "doubleValue": 6890.8677520453875
                },
                "timestamp": {
                    "timeInSeconds": 1580853000,
                    "offsetInNanos": 0
                },
                "quality": "GOOD"
            }
        ]
    }

For more information, see `Querying historical asset property values <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/query-industrial-data.html#historical-values>`__ in the *AWS IoT SiteWise User Guide*.