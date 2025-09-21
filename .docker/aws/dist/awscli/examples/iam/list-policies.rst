**To list managed policies that are available to your AWS account**

This example returns a collection of the first two managed policies available in the current AWS account. ::

    aws iam list-policies \
        --max-items 3

Output::

    {
        "Policies": [
            {
                "PolicyName": "AWSCloudTrailAccessPolicy",
                "PolicyId": "ANPAXQE2B5PJ7YEXAMPLE",
                "Arn": "arn:aws:iam::123456789012:policy/AWSCloudTrailAccessPolicy",
                "Path": "/",
                "DefaultVersionId": "v1",
                "AttachmentCount": 0,
                "PermissionsBoundaryUsageCount": 0,
                "IsAttachable": true,
                "CreateDate": "2019-09-04T17:43:42+00:00",
                "UpdateDate": "2019-09-04T17:43:42+00:00"
            },
            {
                "PolicyName": "AdministratorAccess",
                "PolicyId": "ANPAIWMBCKSKIEE64ZLYK",
                "Arn": "arn:aws:iam::aws:policy/AdministratorAccess",
                "Path": "/",
                "DefaultVersionId": "v1",
                "AttachmentCount": 6,
                "PermissionsBoundaryUsageCount": 0,
                "IsAttachable": true,
                "CreateDate": "2015-02-06T18:39:46+00:00",
                "UpdateDate": "2015-02-06T18:39:46+00:00"
            },
            {
                "PolicyName": "PowerUserAccess",
                "PolicyId": "ANPAJYRXTHIB4FOVS3ZXS",
                "Arn": "arn:aws:iam::aws:policy/PowerUserAccess",
                "Path": "/",
                "DefaultVersionId": "v5",
                "AttachmentCount": 1,
                "PermissionsBoundaryUsageCount": 0,
                "IsAttachable": true,
                "CreateDate": "2015-02-06T18:39:47+00:00",
                "UpdateDate": "2023-07-06T22:04:00+00:00"
            }
        ],
        "NextToken": "EXAMPLErZXIiOiBudWxsLCAiYm90b190cnVuY2F0ZV9hbW91bnQiOiA4fQ=="
    }

For more information, see `Policies and permissions in IAM <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html>`__ in the *AWS IAM User Guide*.