**To get information about an AWS IoT role alias**

The following ``describe-role-alias`` example displays details for the specified role alias. ::

    aws iot describe-role-alias \
        --role-alias LightBulbRole

Output::

    {
        "roleAliasDescription": {
            "roleAlias": "LightBulbRole",
            "roleAliasArn": "arn:aws:iot:us-west-2:123456789012:rolealias/LightBulbRole",
            "roleArn": "arn:aws:iam::123456789012:role/light_bulb_role_001",
            "owner": "123456789012",
            "credentialDurationSeconds": 3600,
            "creationDate": 1570558643.221,
            "lastModifiedDate": 1570558643.221
        }
    }

For more information, see `DescribeRoleAlias <https://docs.aws.amazon.com/iot/latest/apireference/API_DescribeRoleAlias.html>`__ in the *AWS IoT API Reference*.
