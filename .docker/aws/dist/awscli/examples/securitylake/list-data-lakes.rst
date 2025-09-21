**To list the Security Lake configuration object**

The following ``list-data-lakes`` example lists the Amazon Security Lake configuration object for the specified AWS Region. You can use this command to determine whether Security Lake is enabled in a specified Region or Regions. ::

    aws securitylake list-data-lakes \
        --regions "us-east-1"

Output::

    {
        "dataLakes": [
            {
                "createStatus": "COMPLETED",
                "dataLakeArn": "arn:aws:securitylake:us-east-1:123456789012:data-lake/default",
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
                    "roleArn": "arn:aws:securitylake:ap-northeast-3:123456789012:data-lake/default"
                },
                "s3BucketArn": "arn:aws:s3:::aws-security-data-lake-us-east-1-1234567890abcdef0",
                "updateStatus": {
                    "exception": {
                        "code": "software.amazon.awssdk.services.s3.model.S3Exception",
                        "reason": ""
                    },
                    "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                    "status": "FAILED"
                }
            }
        ]
    }

For more information, see `Checking Region status <https://docs.aws.amazon.com/security-lake/latest/userguide/manage-regions.html#check-region-status>`__ in the *Amazon Security Lake User Guide*.
