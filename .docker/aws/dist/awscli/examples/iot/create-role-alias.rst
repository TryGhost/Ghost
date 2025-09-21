**To create a role alias**

The following ``create-role-alias`` example creates a role alias called ``LightBulbRole`` for the specified role. ::

    aws iot create-role-alias \
        --role-alias LightBulbRole \
        --role-arn arn:aws:iam::123456789012:role/lightbulbrole-001

Output::

    {
        "roleAlias": "LightBulbRole",
        "roleAliasArn": "arn:aws:iot:us-west-2:123456789012:rolealias/LightBulbRole"
    }

For more information, see `CreateRoleAlias <https://docs.aws.amazon.com/iot/latest/apireference/API_CreateRoleAlias.html>`__ in the *AWS IoT API Reference*.
