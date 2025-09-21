**To list all users, groups, and roles that the specified managed policy is attached to**

This example returns a list of IAM groups, roles, and users who have the policy ``arn:aws:iam::123456789012:policy/TestPolicy`` attached. ::

    aws iam list-entities-for-policy \
        --policy-arn arn:aws:iam::123456789012:policy/TestPolicy 

Output::

    {
        "PolicyGroups": [
            {
                "GroupName": "Admins",
                "GroupId": "AGPACKCEVSQ6C2EXAMPLE"
            }
        ],
        "PolicyUsers": [
            {
                "UserName": "Alice",
                "UserId": "AIDACKCEVSQ6C2EXAMPLE"
            }
        ],
        "PolicyRoles": [
            {
                "RoleName": "DevRole",
                "RoleId": "AROADBQP57FF2AEXAMPLE"
            }
        ],
        "IsTruncated": false
    }

For more information, see `Policies and permissions in IAM <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html>`__ in the *AWS IAM User Guide*.