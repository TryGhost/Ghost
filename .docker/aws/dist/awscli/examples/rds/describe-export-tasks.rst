**To describe snapshot export tasks**

The following ``describe-export-tasks`` example returns information about snapshot exports to Amazon S3. ::

    aws rds describe-export-tasks

Output::

    {
        "ExportTasks": [
            {
                "ExportTaskIdentifier": "test-snapshot-export",
                "SourceArn": "arn:aws:rds:us-west-2:123456789012:snapshot:test-snapshot",
                "SnapshotTime": "2020-03-02T18:26:28.163Z",
                "TaskStartTime": "2020-03-02T18:57:56.896Z",
                "TaskEndTime": "2020-03-02T19:10:31.985Z",
                "S3Bucket": "amzn-s3-demo-bucket",
                "S3Prefix": "",
                "IamRoleArn": "arn:aws:iam::123456789012:role/service-role/ExportRole",
                "KmsKeyId": "arn:aws:kms:us-west-2:123456789012:key/abcd0000-7fca-4128-82f2-aabbccddeeff",
                "Status": "COMPLETE",
                "PercentProgress": 100,
                "TotalExtractedDataInGB": 0
            },
            {
                "ExportTaskIdentifier": "my-s3-export",
                "SourceArn": "arn:aws:rds:us-west-2:123456789012:snapshot:db5-snapshot-test",
                "SnapshotTime": "2020-03-27T20:48:42.023Z",
                "S3Bucket": "amzn-s3-demo-bucket",
                "S3Prefix": "",
                "IamRoleArn": "arn:aws:iam::123456789012:role/service-role/ExportRole",
                "KmsKeyId": "arn:aws:kms:us-west-2:123456789012:key/abcd0000-7fca-4128-82f2-aabbccddeeff",
                "Status": "STARTING",
                "PercentProgress": 0,
                "TotalExtractedDataInGB": 0
            }
        ]
    }

For more information, see `Monitoring Snapshot Exports <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ExportSnapshot.html#USER_ExportSnapshot.Monitoring>`__ in the *Amazon RDS User Guide*.
