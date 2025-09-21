**To list all managed policies that are attached to the specified role**

This command returns the names and ARNs of the managed policies attached to the IAM role named ``SecurityAuditRole`` in the AWS account. ::

    aws iam list-attached-role-policies \
        --role-name SecurityAuditRole

Output::

    {
        "AttachedPolicies": [
            {
                "PolicyName": "SecurityAudit",
                "PolicyArn": "arn:aws:iam::aws:policy/SecurityAudit"
            }
        ],
        "IsTruncated": false
    }

For more information, see `Policies and permissions in IAM <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html>`__ in the *AWS IAM User Guide*.