**To update a role alias**

The following ``update-role-alias`` example updates the ``LightBulbRole`` role alias. ::

    aws iot update-role-alias \
        --role-alias LightBulbRole \
        --role-arn arn:aws:iam::123456789012:role/lightbulbrole-001

Output::

    {
        "roleAlias": "LightBulbRole",
        "roleAliasArn": "arn:aws:iot:us-west-2:123456789012:rolealias/LightBulbRole"
    }

For more information, see `UpdateRoleAlias <https://docs.aws.amazon.com/iot/latest/apireference/API_UpdateRoleAlias.html>`__ in the *AWS IoT API Reference*.
