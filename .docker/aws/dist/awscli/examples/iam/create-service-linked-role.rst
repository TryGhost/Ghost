**To create a service-linked role**

The following ``create-service-linked-role`` example creates a service-linked role for the specified AWS service and attaches the specified description. ::

    aws iam create-service-linked-role \
        --aws-service-name lex.amazonaws.com \
        --description "My service-linked role to support Lex"

Output::

    {
        "Role": {
            "Path": "/aws-service-role/lex.amazonaws.com/",
            "RoleName": "AWSServiceRoleForLexBots",
            "RoleId": "AROA1234567890EXAMPLE",
            "Arn": "arn:aws:iam::1234567890:role/aws-service-role/lex.amazonaws.com/AWSServiceRoleForLexBots",
            "CreateDate": "2019-04-17T20:34:14+00:00",
            "AssumeRolePolicyDocument": {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Action": [
                            "sts:AssumeRole"
                        ],
                        "Effect": "Allow",
                        "Principal": {
                            "Service": [
                                "lex.amazonaws.com"
                            ]
                        }
                    }
                ]
            }
        }
    }

For more information, see `Using service-linked roles <https://docs.aws.amazon.com/IAM/latest/UserGuide/using-service-linked-roles.html>`__ in the *AWS IAM User Guide*.