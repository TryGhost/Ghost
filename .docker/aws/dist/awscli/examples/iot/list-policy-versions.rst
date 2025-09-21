**Example 1: To see all versions of a policy**

The following ``list-policy-versions`` example lists all versions of the specified policy and their creation dates. ::

    aws iot list-policy-versions \
        --policy-name LightBulbPolicy

Output::

    {
        "policyVersions": [
            {
                "versionId": "2",
                "isDefaultVersion": true,
                "createDate": 1559925941.924
            },
            {
                "versionId": "1",
                "isDefaultVersion": false,
                "createDate": 1559925941.924
            }
        ]
    }

For more information, see `AWS IoT Policies <https://docs.aws.amazon.com/iot/latest/developerguide/iot-policies.html>`__ in the *AWS IoT Developers Guide*.
