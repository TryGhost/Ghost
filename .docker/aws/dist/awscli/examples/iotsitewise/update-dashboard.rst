**To update a dashboard**

The following ``update-dashboard`` example changes the title of a dashboard's line chart that displays total generated power for a wind farm. ::

    aws iotsitewise update-dashboard \
        --project-id a1b2c3d4-5678-90ab-cdef-fffffEXAMPLE \
        --dashboard-name "Wind Farm" \
        --dashboard-definition file://update-wind-farm-dashboard.json

Contents of ``update-wind-farm-dashboard.json``::

    {
        "widgets": [
            {
                "type": "monitor-line-chart",
                "title": "Total Generated Power",
                "x": 0,
                "y": 0,
                "height": 3,
                "width": 3,
                "metrics": [
                    {
                        "label": "Power",
                        "type": "iotsitewise",
                        "assetId": "a1b2c3d4-5678-90ab-cdef-44444EXAMPLE",
                        "propertyId": "a1b2c3d4-5678-90ab-cdef-99999EXAMPLE"
                    }
                ]
            }
        ]
    }

This command produces no output.

For more information, see `Creating dashboards (CLI) <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/create-dashboards-using-aws-cli.html>`__ in the *AWS IoT SiteWise User Guide*.