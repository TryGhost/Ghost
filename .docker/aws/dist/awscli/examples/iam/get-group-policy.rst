**To get information about a policy attached to an IAM group**

The following ``get-group-policy`` command gets information about the specified policy attached to the group named ``Test-Group``. ::

    aws iam get-group-policy \
        --group-name Test-Group \
        --policy-name S3-ReadOnly-Policy

Output::

    {
        "GroupName": "Test-Group",
        "PolicyDocument": {
            "Statement": [
                {
                    "Action": [
                        "s3:Get*",
                        "s3:List*"
                    ],
                    "Resource": "*",
                    "Effect": "Allow"
                }
            ]
        },
        "PolicyName": "S3-ReadOnly-Policy"
    }

For more information, see `Managing IAM policies <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage.html>`__ in the *AWS IAM User Guide*.