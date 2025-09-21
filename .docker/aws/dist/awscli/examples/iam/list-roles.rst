**To list IAM roles for the current account**

The following ``list-roles`` command lists IAM roles for the current account. ::

    aws iam list-roles

Output::

    {
        "Roles": [
            {
                "Path": "/",
                "RoleName": "ExampleRole",
                "RoleId": "AROAJ52OTH4H7LEXAMPLE",
                "Arn": "arn:aws:iam::123456789012:role/ExampleRole",
                "CreateDate": "2017-09-12T19:23:36+00:00",
                "AssumeRolePolicyDocument": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "",
                            "Effect": "Allow",
                            "Principal": {
                                "Service": "ec2.amazonaws.com"
                            },
                            "Action": "sts:AssumeRole"
                        }
                    ]
                },
                "MaxSessionDuration": 3600
            },
            {
                "Path": "/example_path/",
                "RoleName": "ExampleRoleWithPath",
                "RoleId": "AROAI4QRP7UFT7EXAMPLE",
                "Arn": "arn:aws:iam::123456789012:role/example_path/ExampleRoleWithPath",
                "CreateDate": "2023-09-21T20:29:38+00:00",
                "AssumeRolePolicyDocument": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "",
                            "Effect": "Allow",
                            "Principal": {
                                "Service": "ec2.amazonaws.com"
                            },
                            "Action": "sts:AssumeRole"
                        }
                    ]
                },
                "MaxSessionDuration": 3600
            }
        ]
    }

For more information, see `Creating IAM roles <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create.html>`__ in the *AWS IAM User Guide*.