**To list information about the versions of the specified managed policy**

This example returns the list of available versions of the policy whose ARN is ``arn:aws:iam::123456789012:policy/MySamplePolicy``. ::

    aws iam list-policy-versions \
        --policy-arn arn:aws:iam::123456789012:policy/MySamplePolicy 

Output::

    {
        "IsTruncated": false,
        "Versions": [
            {
            "VersionId": "v2",
            "IsDefaultVersion": true,
            "CreateDate": "2015-06-02T23:19:44Z"
            },
            {
            "VersionId": "v1",
            "IsDefaultVersion": false,
            "CreateDate": "2015-06-02T22:30:47Z"
            }
        ]
    }

For more information, see `Policies and permissions in IAM <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html>`__ in the *AWS IAM User Guide*.