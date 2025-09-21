**To create a new version of a managed policy**


This example creates a new ``v2`` version of the IAM policy whose ARN is ``arn:aws:iam::123456789012:policy/MyPolicy`` and makes it the default version. ::

    aws iam create-policy-version \
        --policy-arn arn:aws:iam::123456789012:policy/MyPolicy \
        --policy-document file://NewPolicyVersion.json \
        --set-as-default

Output::

    {
        "PolicyVersion": {
            "CreateDate": "2015-06-16T18:56:03.721Z",
            "VersionId": "v2",
            "IsDefaultVersion": true
        }
    }

For more information, see `Versioning IAM policies <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-versioning.html>`__ in the *AWS IAM User Guide*.