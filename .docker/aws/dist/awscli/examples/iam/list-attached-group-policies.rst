**To list all managed policies that are attached to the specified group**

This example returns the names and ARNs of the managed policies that are attached to the IAM group named ``Admins`` in the AWS account. ::

    aws iam list-attached-group-policies \
        --group-name Admins

Output::

    {
        "AttachedPolicies": [
            {
                "PolicyName": "AdministratorAccess",
                "PolicyArn": "arn:aws:iam::aws:policy/AdministratorAccess"
            },
            {
                "PolicyName": "SecurityAudit",
                "PolicyArn": "arn:aws:iam::aws:policy/SecurityAudit"
            }
        ],
        "IsTruncated": false
    }

For more information, see `Policies and permissions in IAM <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html>`__ in the *AWS IAM User Guide*.