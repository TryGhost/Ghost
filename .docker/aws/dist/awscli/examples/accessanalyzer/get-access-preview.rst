**To retrieves information about an access preview for the specified analyzer**

The following ``get-access-preview`` example retrieves information about an access preview for the specified analyzer in your AWS account. ::

    aws accessanalyzer get-access-preview \
        --access-preview-id 3c65eb13-6ef9-4629-8919-a32043619e6b \
        --analyzer-arn arn:aws:access-analyzer:us-west-2:111122223333:analyzer/ConsoleAnalyzer-account 

Output::

    {
        "accessPreview": {
            "id": "3c65eb13-6ef9-4629-8919-a32043619e6b",
            "analyzerArn": "arn:aws:access-analyzer:us-west-2:111122223333:analyzer/ConsoleAnalyzer-account",
            "configurations": {
                "arn:aws:s3:::amzn-s3-demo-bucket": {
                    "s3Bucket": {
                        "bucketPolicy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":[\"arn:aws:iam::111122223333:root\"]},\"Action\":[\"s3:PutObject\",\"s3:PutObjectAcl\"],\"Resource\":\"arn:aws:s3:::amzn-s3-demo-bucket/*\"}]}",
                        "bucketAclGrants": [
                            {
                                "permission": "READ",
                                "grantee": {
                                    "id": "79a59df900b949e55d96a1e698fbacedfd6e09d98eacf8f8d5218e7cd47ef2be"
                                }
                            }
                        ],
                        "bucketPublicAccessBlock": {
                            "ignorePublicAcls": true,
                            "restrictPublicBuckets": true
                        }
                    }
                }
            },
            "createdAt": "2024-02-17T00:18:44+00:00",
            "status": "COMPLETED"
        }
    }

For more information, see `Previewing access with IAM Access Analyzer APIs <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-preview-access-apis.html>`__ in the *AWS IAM User Guide*.