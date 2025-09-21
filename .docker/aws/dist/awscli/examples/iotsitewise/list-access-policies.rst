**To list all access policies**

The following ``list-access-policies`` example lists all access policies for a user who is a portal administrator. ::

    aws iotsitewise list-access-policies \
        --identity-type USER \
        --identity-id a1b2c3d4e5-a1b2c3d4-5678-90ab-cdef-bbbbbEXAMPLE

Output::

    {
        "accessPolicySummaries": [
            {
                "id": "a1b2c3d4-5678-90ab-cdef-cccccEXAMPLE",
                "identity": {
                    "user": {
                        "id": "a1b2c3d4e5-a1b2c3d4-5678-90ab-cdef-bbbbbEXAMPLE"
                    }
                },
                "resource": {
                    "portal": {
                        "id": "a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE"
                    }
                },
                "permission": "ADMINISTRATOR"
            }
        ]
    }

For more information, see `Administering your portals <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/administer-portals.html>`__ in the *AWS IoT SiteWise User Guide*.