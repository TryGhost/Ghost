**Example 1: To configure your data lake in multiple Regions**

The following ``create-data-lake`` example enables Amazon Security Lake in multiple AWS Regions and configures your data lake. ::

    aws securitylake create-data-lake \
        --configurations '[{"encryptionConfiguration": {"kmsKeyId":"S3_MANAGED_KEY"},"region":"us-east-1","lifecycleConfiguration": {"expiration":{"days":365},"transitions":[{"days":60,"storageClass":"ONEZONE_IA"}]}}, {"encryptionConfiguration": {"kmsKeyId":"S3_MANAGED_KEY"},"region":"us-east-2","lifecycleConfiguration": {"expiration":{"days":365},"transitions":[{"days":60,"storageClass":"ONEZONE_IA"}]}}]' \
        --meta-store-manager-role-arn "arn:aws:iam:us-east-1:123456789012:role/service-role/AmazonSecurityLakeMetaStoreManager"

Output::

    {
        "dataLakes": [
            {
                "createStatus": "COMPLETED",
                "dataLakeArn": "arn:aws:securitylake:us-east-1:522481757177:data-lake/default",
                "encryptionConfiguration": {
                    "kmsKeyId": "S3_MANAGED_KEY"
                },
                "lifecycleConfiguration": {
                    "expiration": {
                        "days": 365
                    },
                    "transitions": [
                        {
                            "days": 60,
                            "storageClass": "ONEZONE_IA"
                        }
                    ]
                },
                "region": "us-east-1",
                "replicationConfiguration": {
                    "regions": [
                        "ap-northeast-3"
                    ],
                    "roleArn": "arn:aws:securitylake:ap-northeast-3:522481757177:data-lake/default"
                },
                "s3BucketArn": "arn:aws:s3:::aws-security-data-lake-us-east-1-gnevt6s8z7bzby8oi3uiaysbr8v2ml",
                "updateStatus": {
                    "exception": {},
                    "requestId": "f20a6450-d24a-4f87-a6be-1d4c075a59c2",
                    "status": "INITIALIZED"
                }
            },
            {
                "createStatus": "COMPLETED",
                "dataLakeArn": "arn:aws:securitylake:us-east-2:522481757177:data-lake/default",
                "encryptionConfiguration": {
                    "kmsKeyId": "S3_MANAGED_KEY"
                },
                "lifecycleConfiguration": {
                    "expiration": {
                        "days": 365
                    },
                    "transitions": [
                        {
                            "days": 60,
                            "storageClass": "ONEZONE_IA"
                        }
                    ]
                },
                "region": "us-east-2",
                "replicationConfiguration": {
                    "regions": [
                        "ap-northeast-3"
                    ],
                    "roleArn": "arn:aws:securitylake:ap-northeast-3:522481757177:data-lake/default"
                },
                "s3BucketArn": "arn:aws:s3:::aws-security-data-lake-us-east-2-cehuifzl5rwmhm6m62h7zhvtseogr9",
                "updateStatus": {
                    "exception": {},
                    "requestId": "f20a6450-d24a-4f87-a6be-1d4c075a59c2",
                    "status": "INITIALIZED"
                }
            }
        ]
    }

For more information, see `Getting started with Amazon Security Lake <https://docs.aws.amazon.com/security-lake/latest/userguide/getting-started.html>`__ in the *Amazon Security Lake User Guide*.

**Example 2: To configure your data lake in a single Region**

The following ``create-data-lake`` example enables Amazon Security Lake in a single AWS Region and configures your data lake. ::

    aws securitylake create-data-lake \
        --configurations '[{"encryptionConfiguration": {"kmsKeyId":"1234abcd-12ab-34cd-56ef-1234567890ab"},"region":"us-east-2","lifecycleConfiguration": {"expiration":{"days":500},"transitions":[{"days":30,"storageClass":"GLACIER"}]}}]' \
        --meta-store-manager-role-arn "arn:aws:iam:us-east-1:123456789012:role/service-role/AmazonSecurityLakeMetaStoreManager"

Output::

    {
        "dataLakes": [
            {
                "createStatus": "COMPLETED",
                "dataLakeArn": "arn:aws:securitylake:us-east-2:522481757177:data-lake/default",
                "encryptionConfiguration": {
                    "kmsKeyId": "1234abcd-12ab-34cd-56ef-1234567890ab"
                },
                "lifecycleConfiguration": {
                    "expiration": {
                        "days": 500
                    },
                    "transitions": [
                        {
                            "days": 30,
                            "storageClass": "GLACIER"
                        }
                    ]
                },
                "region": "us-east-2",
                "replicationConfiguration": {
                    "regions": [
                        "ap-northeast-3"
                    ],
                    "roleArn": "arn:aws:securitylake:ap-northeast-3:522481757177:data-lake/default"
                },
                "s3BucketArn": "arn:aws:s3:::aws-security-data-lake-us-east-2-cehuifzl5rwmhm6m62h7zhvtseogr9",
                "updateStatus": {
                    "exception": {},
                    "requestId": "77702a53-dcbf-493e-b8ef-518e362f3003",
                    "status": "INITIALIZED"
                }
            }
        ]
    }

For more information, see `Getting started with Amazon Security Lake <https://docs.aws.amazon.com/security-lake/latest/userguide/getting-started.html>`__ in the *Amazon Security Lake User Guide*.