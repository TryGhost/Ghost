**To cancel a snapshot export to Amazon S3**

The following ``cancel-export-task`` example cancels an export task in progress that is exporting a snapshot to Amazon S3. ::

    aws rds cancel-export-task \
        --export-task-identifier my-s3-export-1

Output::

    {
        "ExportTaskIdentifier": "my-s3-export-1",
        "SourceArn": "arn:aws:rds:us-east-1:123456789012:snapshot:publisher-final-snapshot",
        "SnapshotTime": "2019-03-24T20:01:09.815Z",
        "S3Bucket": "amzn-s3-demo-bucket",
        "S3Prefix": "",
        "IamRoleArn": "arn:aws:iam::123456789012:role/service-role/export-snap-S3-role",
        "KmsKeyId": "arn:aws:kms:us-east-1:123456789012:key/abcd0000-7bfd-4594-af38-aabbccddeeff",
        "Status": "CANCELING",
        "PercentProgress": 0,
        "TotalExtractedDataInGB": 0
    }

For more information, see `Canceling a snapshot export task <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ExportSnapshot.html#USER_ExportSnapshot.Canceling>`__ in the *Amazon RDS User Guide* or `Canceling a snapshot export task <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_ExportSnapshot.html#USER_ExportSnapshot.Canceling>`__ in the *Amazon Aurora User Guide*.