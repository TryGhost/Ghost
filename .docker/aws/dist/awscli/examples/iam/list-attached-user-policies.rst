**To list all managed policies that are attached to the specified user**

This command returns the names and ARNs of the managed policies for the IAM user named ``Bob`` in the AWS account. ::

    aws iam list-attached-user-policies \
        --user-name Bob

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