**To change an IAM role's description**

The following ``update-role`` command changes the description of the IAM role ``production-role`` to ``Main production role``. ::

    aws iam update-role-description \
        --role-name production-role \
        --description 'Main production role'

Output::

    {
        "Role": {
            "Path": "/",
            "RoleName": "production-role",
            "RoleId": "AROA1234567890EXAMPLE",
            "Arn": "arn:aws:iam::123456789012:role/production-role",
            "CreateDate": "2017-12-06T17:16:37+00:00",
            "AssumeRolePolicyDocument": {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "AWS": "arn:aws:iam::123456789012:root"
                        },
                        "Action": "sts:AssumeRole",
                        "Condition": {}
                    }
                ]
            },
            "Description": "Main production role"
        }
    }

For more information, see `Modifying a role <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_manage_modify.html>`__ in the *AWS IAM User Guide*.

