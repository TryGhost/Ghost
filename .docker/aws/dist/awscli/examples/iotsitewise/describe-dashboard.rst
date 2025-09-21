**To describe a dashboard**

The following ``describe-dashboard`` example describes the specified wind farm dashboard. ::

    aws iotsitewise describe-dashboard \
        --dashboard-id a1b2c3d4-5678-90ab-cdef-fffffEXAMPLE

Output::

    {
        "dashboardId": "a1b2c3d4-5678-90ab-cdef-fffffEXAMPLE",
        "dashboardArn": "arn:aws:iotsitewise:us-west-2:123456789012:dashboard/a1b2c3d4-5678-90ab-cdef-fffffEXAMPLE",
        "dashboardName": "Wind Farm",
        "projectId": "a1b2c3d4-5678-90ab-cdef-eeeeeEXAMPLE",
        "dashboardDefinition": "{\"widgets\":[{\"type\":\"monitor-line-chart\",\"title\":\"Generated Power\",\"x\":0,\"y\":0,\"height\":3,\"width\":3,\"metrics\":[{\"label\":\"Power\",\"type\":\"iotsitewise\",\"assetId\":\"a1b2c3d4-5678-90ab-cdef-44444EXAMPLE\",\"propertyId\":\"a1b2c3d4-5678-90ab-cdef-99999EXAMPLE\"}]}]}",
        "dashboardCreationDate": "2020-05-01T20:32:12.228476348Z",
        "dashboardLastUpdateDate": "2020-05-01T20:32:12.228476348Z"
    }

For more information, see `Viewing dashboards <https://docs.aws.amazon.com/iot-sitewise/latest/appguide/view-dashboards.html>`__ in the *AWS IoT SiteWise Monitor Application Guide*.