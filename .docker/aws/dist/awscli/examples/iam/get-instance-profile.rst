**To get information about an instance profile**

The following ``get-instance-profile`` command gets information about the instance profile named ``ExampleInstanceProfile``. ::

    aws iam get-instance-profile \
        --instance-profile-name ExampleInstanceProfile

Output::

    {
        "InstanceProfile": {
            "InstanceProfileId": "AID2MAB8DPLSRHEXAMPLE",
            "Roles": [
                {
                    "AssumeRolePolicyDocument": "<URL-encoded-JSON>",
                    "RoleId": "AIDGPMS9RO4H3FEXAMPLE",
                    "CreateDate": "2013-01-09T06:33:26Z",
                    "RoleName": "Test-Role",
                    "Path": "/",
                    "Arn": "arn:aws:iam::336924118301:role/Test-Role"
                }
            ],
            "CreateDate": "2013-06-12T23:52:02Z",
            "InstanceProfileName": "ExampleInstanceProfile",
            "Path": "/",
            "Arn": "arn:aws:iam::336924118301:instance-profile/ExampleInstanceProfile"
        }
    }

For more information, see `Using instance profiles <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html>`__ in the *AWS IAM User Guide*.