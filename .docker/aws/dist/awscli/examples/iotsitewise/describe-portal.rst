**To describe a portal**

The following ``describe-portal`` example describes a web portal for a wind farm company. ::

    aws iotsitewise describe-portal \
        --portal-id a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE

Output::

    {
        "portalId": "a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE",
        "portalArn": "arn:aws:iotsitewise:us-west-2:123456789012:portal/a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE",
        "portalName": "WindFarmPortal",
        "portalDescription": "A portal that contains wind farm projects for Example Corp.",
        "portalClientId": "E-a1b2c3d4e5f6_a1b2c3d4e5f6EXAMPLE",
        "portalStartUrl": "https://a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE.app.iotsitewise.aws",
        "portalContactEmail": "support@example.com",
        "portalStatus": {
            "state": "ACTIVE"
        },
        "portalCreationDate": "2020-02-04T23:01:52.90248068Z",
        "portalLastUpdateDate": "2020-02-04T23:01:52.90248078Z",
        "roleArn": "arn:aws:iam::123456789012:role/MySiteWiseMonitorServiceRole"
    }

For more information, see `Administering your portals <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/administer-portals.html>`__ in the *AWS IoT SiteWise User Guide*.