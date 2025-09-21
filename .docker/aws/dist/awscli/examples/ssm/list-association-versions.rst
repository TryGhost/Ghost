**To list all versions of an association for a specific association ID**

The following ``list-association-versions`` example lists all versions of the specified associations. ::

    aws ssm list-association-versions \
        --association-id "8dfe3659-4309-493a-8755-0123456789ab"

Output::

    {
    "AssociationVersions": [
            {
                "AssociationId": "8dfe3659-4309-493a-8755-0123456789ab",
                "AssociationVersion": "1",
                "CreatedDate": 1550505536.726,
                "Name": "AWS-UpdateSSMAgent",
                "Parameters": {
                    "allowDowngrade": [
                        "false"
                    ],
                    "version": [
                        ""
                    ]
                },
                "Targets": [
                    {
                        "Key": "InstanceIds",
                        "Values": [
                            "i-1234567890abcdef0"
                        ]
                    }
                ],
                "ScheduleExpression": "cron(0 00 12 ? * SUN *)",
                "AssociationName": "UpdateSSMAgent"
            }
        ]
    }

For more information, see `Working with associations in Systems Manager  <https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-associations.html>`__ in the *AWS Systems Manager User Guide*.