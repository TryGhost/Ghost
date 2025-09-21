**To list the AWS IoT role aliases in your AWS account**

The following ``list-role-aliases`` example lists the AWS IoT role aliases in your AWS account. ::

    aws iot list-role-aliases

Output::

    {
        "roleAliases": [
            "ResidentAlias",
            "ElectricianAlias"
        ]
    }

For more information, see `ListRoleAliases <https://docs.aws.amazon.com/iot/latest/apireference/API_ListRoleAliases.html>`__ in the *AWS IoT API Reference*.
