**To create an access preview that allows you to preview IAM Access Analyzer findings for your resource before deploying resource permissions**

The following ``create-access-preview`` example creates an access preview that allows you to preview IAM Access Analyzer findings for your resource before deploying resource permissions in your AWS account. ::

    aws accessanalyzer create-access-preview \
        --analyzer-arn arn:aws:access-analyzer:us-west-2:111122223333:analyzer/ConsoleAnalyzer-account \
        --configurations file://myfile.json

Contents of ``myfile.json``::

    {
        "arn:aws:s3:::amzn-s3-demo-bucket": {
            "s3Bucket": {
                "bucketPolicy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":[\"arn:aws:iam::111122223333:root\"]},\"Action\":[\"s3:PutObject\",\"s3:PutObjectAcl\"],\"Resource\":\"arn:aws:s3:::amzn-s3-demo-bucket/*\"}]}",
                "bucketPublicAccessBlock": {
                    "ignorePublicAcls": true,
                    "restrictPublicBuckets": true
                },
                "bucketAclGrants": [
                    {
                        "grantee": {
                            "id": "79a59df900b949e55d96a1e698fbacedfd6e09d98eacf8f8d5218e7cd47ef2be"
                        },
                        "permission": "READ"
                    }
                ]
            }
        }
    }

Output::

    {
        "id": "3c65eb13-6ef9-4629-8919-a32043619e6b"
    }

For more information, see `Previewing access with IAM Access Analyzer APIs <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-preview-access-apis.html>`__ in the *AWS IAM User Guide*.