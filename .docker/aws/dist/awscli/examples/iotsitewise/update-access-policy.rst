**To grant a project viewer ownership of a project**

The following ``update-access-policy`` example updates an access policy that grants a project viewer ownership of a project. ::

    aws iotsitewise update-access-policy \
        --access-policy-id a1b2c3d4-5678-90ab-cdef-dddddEXAMPLE \
        --cli-input-json file://update-project-viewer-access-policy.json

Contents of ``update-project-viewer-access-policy.json``::

    {
        "accessPolicyIdentity": {
            "user": { 
                "id": "a1b2c3d4e5-a1b2c3d4-5678-90ab-cdef-bbbbbEXAMPLE"
            }
        },
        "accessPolicyPermission": "ADMINISTRATOR",
        "accessPolicyResource": { 
            "project": { 
                "id": "a1b2c3d4-5678-90ab-cdef-eeeeeEXAMPLE"
            }
        }
    }

This command produces no output.

For more information, see `Assigning project owners <https://docs.aws.amazon.com/iot-sitewise/latest/appguide/assign-project-owners.html>`__ in the *AWS IoT SiteWise Monitor Application Guide*.