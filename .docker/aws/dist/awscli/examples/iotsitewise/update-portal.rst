**To update a portal's details**

The following ``update-portal`` example updates a web portal for a wind farm company. ::

    aws iotsitewise update-portal \
        --portal-id a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE \
        --portal-name WindFarmPortal \
        --portal-description "A portal that contains wind farm projects for Example Corp." \
        --portal-contact-email support@example.com \
        --role-arn arn:aws:iam::123456789012:role/MySiteWiseMonitorServiceRole

Output::

    {
        "portalStatus": {
            "state": "UPDATING"
        }
    }

For more information, see `Administering your portals <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/administer-portals.html>`__ in the *AWS IoT SiteWise User Guide*.