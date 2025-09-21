**To get information about an IAM role**

The following ``get-role`` command gets information about the role named ``Test-Role``. ::

    aws iam get-role \
        --role-name Test-Role

Output::

    {
        "Role": {
            "Description": "Test Role",
            "AssumeRolePolicyDocument":"<URL-encoded-JSON>",
            "MaxSessionDuration": 3600,
            "RoleId": "AROA1234567890EXAMPLE",
            "CreateDate": "2019-11-13T16:45:56Z",
            "RoleName": "Test-Role",
            "Path": "/",
            "RoleLastUsed": {
                "Region": "us-east-1",
                "LastUsedDate": "2019-11-13T17:14:00Z"
            },
            "Arn": "arn:aws:iam::123456789012:role/Test-Role"
        }
    }

The command displays the trust policy attached to the role. To list the permissions policies attached to a role, use the ``list-role-policies`` command.

For more information, see `Creating IAM roles <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create.html>`__ in the *AWS IAM User Guide*.