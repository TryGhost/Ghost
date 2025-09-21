**To retrieve information about the specified version of the specified managed policy**

This example returns the policy document for the v2 version of the policy whose ARN is ``arn:aws:iam::123456789012:policy/MyManagedPolicy``. ::

    aws iam get-policy-version \
        --policy-arn arn:aws:iam::123456789012:policy/MyPolicy \
        --version-id v2

Output::

    {
        "PolicyVersion": {
            "Document": {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": "iam:*",
                        "Resource": "*"
                    }
                ]
            },
            "VersionId": "v2",
            "IsDefaultVersion": true,
            "CreateDate": "2023-04-11T00:22:54+00:00"
        }
    }

For more information, see `Policies and permissions in IAM <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html>`__ in the *AWS IAM User Guide*.