**To list the instance profiles for an IAM role**

The following ``list-instance-profiles-for-role`` command lists the instance profiles that are associated with the role ``Test-Role``. ::

    aws iam list-instance-profiles-for-role \
        --role-name Test-Role

Output::

    {
        "InstanceProfiles": [
            {
                "InstanceProfileId": "AIDGPMS9RO4H3FEXAMPLE",
                "Roles": [
                    {
                        "AssumeRolePolicyDocument": "<URL-encoded-JSON>",
                        "RoleId": "AIDACKCEVSQ6C2EXAMPLE",
                        "CreateDate": "2013-06-07T20:42:15Z",
                        "RoleName": "Test-Role",
                        "Path": "/",
                        "Arn": "arn:aws:iam::123456789012:role/Test-Role"
                    }
                ],
                "CreateDate": "2013-06-07T21:05:24Z",
                "InstanceProfileName": "ExampleInstanceProfile",
                "Path": "/",
                "Arn": "arn:aws:iam::123456789012:instance-profile/ExampleInstanceProfile"
            }
        ]
    }

For more information, see `Using instance profiles <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html>`__ in the *AWS IAM User Guide*.