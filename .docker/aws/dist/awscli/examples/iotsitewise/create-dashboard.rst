**To create a dashboard**

The following ``create-dashboard`` example creates a dashboard with a line chart that displays total generated power for a wind farm. ::

    aws iotsitewise create-dashboard \
        --project-id a1b2c3d4-5678-90ab-cdef-eeeeeEXAMPLE \
        --dashboard-name "Wind Farm" \
        --dashboard-definition file://create-wind-farm-dashboard.json

Contents of ``create-wind-farm-dashboard.json``::

    {
        "widgets": [
            {
                "type": "monitor-line-chart",
                "title": "Generated Power",
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

Output::

    {
        "dashboardId": "a1b2c3d4-5678-90ab-cdef-fffffEXAMPLE",
        "dashboardArn": "arn:aws:iotsitewise:us-west-2:123456789012:dashboard/a1b2c3d4-5678-90ab-cdef-fffffEXAMPLE"
    }

For more information, see `Creating dashboards (CLI) <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/create-dashboards-using-aws-cli.html>`__ in the *AWS IoT SiteWise User Guide*.