**To lists the instance profiles for the account**

The following ``list-instance-profiles`` command lists the instance profiles that are associated with the current account. ::

    aws iam list-instance-profiles

Output::

    {
        "InstanceProfiles": [
            {
                "Path": "/",
                "InstanceProfileName": "example-dev-role",
                "InstanceProfileId": "AIPAIXEU4NUHUPEXAMPLE",
                "Arn": "arn:aws:iam::123456789012:instance-profile/example-dev-role",
                "CreateDate": "2023-09-21T18:17:41+00:00",
                "Roles": [
                    {
                        "Path": "/",
                        "RoleName": "example-dev-role",
                        "RoleId": "AROAJ52OTH4H7LEXAMPLE",
                        "Arn": "arn:aws:iam::123456789012:role/example-dev-role",
                        "CreateDate": "2023-09-21T18:17:40+00:00",
                        "AssumeRolePolicyDocument": {
                            "Version": "2012-10-17",
                            "Statement": [
                                {
                                    "Effect": "Allow",
                                    "Principal": {
                                        "Service": "ec2.amazonaws.com"
                                    },
                                    "Action": "sts:AssumeRole"
                                }
                            ]
                        }
                    }
                ]
            },
            {
                "Path": "/",
                "InstanceProfileName": "example-s3-role",
                "InstanceProfileId": "AIPAJVJVNRIQFREXAMPLE",
                "Arn": "arn:aws:iam::123456789012:instance-profile/example-s3-role",
                "CreateDate": "2023-09-21T18:18:50+00:00",
                "Roles": [
                    {
                        "Path": "/",
                        "RoleName": "example-s3-role",
                        "RoleId": "AROAINUBC5O7XLEXAMPLE",
                        "Arn": "arn:aws:iam::123456789012:role/example-s3-role",
                        "CreateDate": "2023-09-21T18:18:49+00:00",
                        "AssumeRolePolicyDocument": {
                            "Version": "2012-10-17",
                            "Statement": [
                                {
                                    "Effect": "Allow",
                                    "Principal": {
                                        "Service": "ec2.amazonaws.com"
                                    },
                                    "Action": "sts:AssumeRole"
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }

For more information, see `Using instance profiles <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html>`__ in the *AWS IAM User Guide*.