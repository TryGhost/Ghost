**To list journal export jobs**

The following ``list-journal-s3-exports`` example lists journal export jobs for all ledgers that are associated with the current AWS account and Region. ::

    aws qldb list-journal-s3-exports

Output::

    {
        "JournalS3Exports": [
            {
                "Status": "IN_PROGRESS",
                "LedgerName": "myExampleLedger",
                "S3ExportConfiguration": {
                    "EncryptionConfiguration": {
                        "ObjectEncryptionType": "SSE_S3"
                    },
                    "Bucket": "amzn-s3-demo-bucket",
                    "Prefix": "ledgerexport1/"
                },
                "RoleArn": "arn:aws:iam::123456789012:role/my-s3-export-role",
                "ExportCreationTime": 1568847801.418,
                "ExportId": "ADR2ONPKN5LINYGb4dp7yZ",
                "InclusiveStartTime": 1568764800.0,
                "ExclusiveEndTime": 1568847599.0
            },
            {
                "Status": "COMPLETED",
                "LedgerName": "myExampleLedger2",
                "S3ExportConfiguration": {
                    "EncryptionConfiguration": {
                        "ObjectEncryptionType": "SSE_S3"
                    },
                    "Bucket": "amzn-s3-demo-bucket",
                    "Prefix": "ledgerexport1/"
                },
                "RoleArn": "arn:aws:iam::123456789012:role/my-s3-export-role",
                "ExportCreationTime": 1568846847.638,
                "ExportId": "2pdvW8UQrjBAiYTMehEJDI",
                "InclusiveStartTime": 1568592000.0,
                "ExclusiveEndTime": 1568764800.0
            }
        ]
    }

For more information, see `Exporting Your Journal in Amazon QLDB <https://docs.aws.amazon.com/qldb/latest/developerguide/export-journal.html>`__ in the *Amazon QLDB Developer Guide*.
