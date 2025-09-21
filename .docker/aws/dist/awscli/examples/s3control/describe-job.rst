**To describe an Amazon S3 batch operations job**

The following ``describe-job`` provides configuration parameters and status for the specified batch operations job. ::

    aws s3control describe-job \
        --account-id 123456789012 \
        --job-id 93735294-df46-44d5-8638-6356f335324e

Output::

    {
        "Job": {
            "TerminationDate": "2019-10-03T21:49:53.944Z",
            "JobId": "93735294-df46-44d5-8638-6356f335324e",
            "FailureReasons": [],
            "Manifest": {
                "Spec": {
                    "Fields": [
                        "Bucket",
                        "Key"
                    ],
                    "Format": "S3BatchOperations_CSV_20180820"
                },
                "Location": {
                    "ETag": "69f52a4e9f797e987155d9c8f5880897",
                    "ObjectArn": "arn:aws:s3:::employee-records-logs/inv-report/7a6a9be4-072c-407e-85a2-ec3e982f773e.csv"
                }
            },
            "Operation": {
                "S3PutObjectTagging": {
                    "TagSet": [
                        {
                            "Value": "true",
                            "Key": "confidential"
                        }
                    ]
                }
            },
            "RoleArn": "arn:aws:iam::123456789012:role/S3BatchJobRole",
            "ProgressSummary": {
                "TotalNumberOfTasks": 8,
                "NumberOfTasksFailed": 0,
                "NumberOfTasksSucceeded": 8
            },
            "Priority": 42,
            "Report": {
                "ReportScope": "AllTasks",
                "Format": "Report_CSV_20180820",
                "Enabled": true,
                "Prefix": "batch-op-create-job",
                "Bucket": "arn:aws:s3:::employee-records-logs"
            },
            "JobArn": "arn:aws:s3:us-west-2:123456789012:job/93735294-df46-44d5-8638-6356f335324e",
            "CreationTime": "2019-10-03T21:48:48.048Z",
            "Status": "Complete"
        }
    }
