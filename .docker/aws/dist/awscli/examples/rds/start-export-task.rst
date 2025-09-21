**To export a snapshot to Amazon S3**

The following ``start-export-task`` example exports a DB snapshot named ``db5-snapshot-test`` to the Amazon S3 bucket named ``amzn-s3-demo-bucket``. ::

    aws rds start-export-task \
        --export-task-identifier my-s3-export \
        --source-arn arn:aws:rds:us-west-2:123456789012:snapshot:db5-snapshot-test \
        --s3-bucket-name amzn-s3-demo-bucket \
        --iam-role-arn arn:aws:iam::123456789012:role/service-role/ExportRole \
        --kms-key-id arn:aws:kms:us-west-2:123456789012:key/abcd0000-7fca-4128-82f2-aabbccddeeff

Output::

    {
        "ExportTaskIdentifier": "my-s3-export",
        "SourceArn": "arn:aws:rds:us-west-2:123456789012:snapshot:db5-snapshot-test",
        "SnapshotTime": "2020-03-27T20:48:42.023Z",
        "S3Bucket": "amzn-s3-demo-bucket",
        "IamRoleArn": "arn:aws:iam::123456789012:role/service-role/ExportRole",
        "KmsKeyId": "arn:aws:kms:us-west-2:123456789012:key/abcd0000-7fca-4128-82f2-aabbccddeeff",
        "Status": "STARTING",
        "PercentProgress": 0,
        "TotalExtractedDataInGB": 0
    }

For more information, see `Exporting a Snapshot to an Amazon S3 Bucket <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ExportSnapshot.html#USER_ExportSnapshot.Exporting>`__ in the *Amazon RDS User Guide*.
