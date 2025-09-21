**To describe an access policy**

The following ``describe-access-policy`` example describes an access policy that grants a user administrative access to a web portal for a wind farm company. ::

    aws iotsitewise describe-access-policy \
        --access-policy-id a1b2c3d4-5678-90ab-cdef-cccccEXAMPLE

Output::

    {
        "accessPolicyId": "a1b2c3d4-5678-90ab-cdef-cccccEXAMPLE",
        "accessPolicyArn": "arn:aws:iotsitewise:us-west-2:123456789012:access-policy/a1b2c3d4-5678-90ab-cdef-cccccEXAMPLE",
        "accessPolicyIdentity": {
            "user": {
                "id": "a1b2c3d4e5-a1b2c3d4-5678-90ab-cdef-bbbbbEXAMPLE"
            }
        },
        "accessPolicyResource": {
            "portal": {
                "id": "a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE"
            }
        },
        "accessPolicyPermission": "ADMINISTRATOR",
        "accessPolicyCreationDate": "2020-02-20T22:35:15.552880124Z",
        "accessPolicyLastUpdateDate": "2020-02-20T22:35:15.552880124Z"
    }

For more information, see `Adding or removing portal administrators <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/administer-portals.html#portal-change-admins>`__ in the *AWS IoT SiteWise User Guide*.