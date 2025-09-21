**To check whether the specified access isn't allowed by a policy**

The following ``check-access-not-granted`` example checks whether the specified access isn't allowed by a policy. ::

    aws accessanalyzer check-access-not-granted \
        --policy-document file://myfile.json \
        --access actions="s3:DeleteBucket","s3:GetBucketLocation" \
        --policy-type IDENTITY_POLICY

Contents of ``myfile.json``::

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

Output::

    {
        "result": "PASS",
        "message": "The policy document does not grant access to perform one or more of the listed actions."
    }

For more information, see `Previewing access with IAM Access Analyzer APIs <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-preview-access-apis.html>`__ in the *AWS IAM User Guide*.