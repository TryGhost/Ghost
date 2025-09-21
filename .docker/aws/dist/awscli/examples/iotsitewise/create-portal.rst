**To create a portal**

The following ``create-portal`` example creates a web portal for a wind farm company. You can create portals only in the same Region where you enabled AWS Single Sign-On. ::

    aws iotsitewise create-portal \
        --portal-name WindFarmPortal \
        --portal-description "A portal that contains wind farm projects for Example Corp." \
        --portal-contact-email support@example.com \
        --role-arn arn:aws:iam::123456789012:role/service-role/MySiteWiseMonitorServiceRole

Output::

    {
        "portalId": "a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE",
        "portalArn": "arn:aws:iotsitewise:us-west-2:123456789012:portal/a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE",
        "portalStartUrl": "https://a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE.app.iotsitewise.aws",
        "portalStatus": {
            "state": "CREATING"
        },
        "ssoApplicationId": "ins-a1b2c3d4-EXAMPLE"
    }

For more information, see `Getting started with AWS IoT SiteWise Monitor <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/monitor-getting-started.html>`__ in the *AWS IoT SiteWise User Guide* and `Enabling AWS SSO <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/monitor-getting-started.html#monitor-enable-sso>`__ in the *AWS IoT SiteWise User Guide*..