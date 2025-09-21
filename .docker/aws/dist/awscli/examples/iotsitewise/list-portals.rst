**To list all portals**

The following ``list-portals`` example lists all portals that are defined in your AWS account in the current Region. ::

    aws iotsitewise list-portals

Output::

    {
        "portalSummaries": [
            {
                "id": "a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE",
                "name": "WindFarmPortal",
                "description": "A portal that contains wind farm projects for Example Corp.",
                "startUrl": "https://a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE.app.iotsitewise.aws",
                "creationDate": "2020-02-04T23:01:52.90248068Z",
                "lastUpdateDate": "2020-02-04T23:01:52.90248078Z",
                "roleArn": "arn:aws:iam::123456789012:role/service-role/MySiteWiseMonitorServiceRole"
            }
        ]
    }

For more information, see `Administering your portals <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/administer-portals.html>`__ in the *AWS IoT SiteWise User Guide*.