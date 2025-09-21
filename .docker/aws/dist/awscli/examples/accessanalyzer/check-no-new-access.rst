**To check whether new access is allowed for an updated policy when compared to the existing policy**

The following ``check-no-new-access`` example checks whether new access is allowed for an updated policy when compared to the existing policy. ::

    aws accessanalyzer check-no-new-access \
        --existing-policy-document file://existing-policy.json \
        --new-policy-document file://new-policy.json \
        --policy-type IDENTITY_POLICY

Contents of ``existing-policy.json``::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject",
                    "s3:ListBucket"
                ],
                "Resource": [
                    "arn:aws:s3:::amzn-s3-demo-bucket",
                    "arn:aws:s3:::amzn-s3-demo-bucket/*"
                ]
            }
        ]
    }

Contents of ``new-policy.json``::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject",
                    "s3:GetObjectAcl",
                    "s3:ListBucket"
                ],
                "Resource": [
                    "arn:aws:s3:::amzn-s3-demo-bucket",
                    "arn:aws:s3:::amzn-s3-demo-bucket/*"
                ]
            }
        ]
    }

Output::

    {
        "result": "FAIL",
        "message": "The modified permissions grant new access compared to your existing policy.",
        "reasons": [
            {
                "description": "New access in the statement with index: 0.",
                "statementIndex": 0
            }
        ]
    }

For more information, see `Previewing access with IAM Access Analyzer APIs <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-preview-access-apis.html>`__ in the *AWS IAM User Guide*.