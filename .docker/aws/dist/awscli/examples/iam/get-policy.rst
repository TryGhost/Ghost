**To retrieve information about the specified managed policy**

This example returns details about the managed policy whose ARN is ``arn:aws:iam::123456789012:policy/MySamplePolicy``. ::

    aws iam get-policy \
        --policy-arn arn:aws:iam::123456789012:policy/MySamplePolicy

Output::

    {
        "Policy": {
            "PolicyName": "MySamplePolicy",
            "CreateDate": "2015-06-17T19:23;32Z",
            "AttachmentCount": 0,
            "IsAttachable": true,
            "PolicyId": "Z27SI6FQMGNQ2EXAMPLE1",
            "DefaultVersionId": "v1",
            "Path": "/",
            "Arn": "arn:aws:iam::123456789012:policy/MySamplePolicy",
            "UpdateDate": "2015-06-17T19:23:32Z"
        }
    }

For more information, see `Policies and permissions in IAM <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html>`__ in the *AWS IAM User Guide*.