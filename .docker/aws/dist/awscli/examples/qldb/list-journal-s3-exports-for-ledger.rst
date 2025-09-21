**To list journal export jobs for a ledger**

The following ``list-journal-s3-exports-for-ledger`` example lists journal export jobs for the specified ledger. ::

    aws qldb list-journal-s3-exports-for-ledger \
        --name myExampleLedger

Output::

    {
        "JournalS3Exports": [
            {
                "LedgerName": "myExampleLedger",
                "ExclusiveEndTime": 1568847599.0,
                "ExportCreationTime": 1568847801.418,
                "S3ExportConfiguration": {
                    "Bucket": "amzn-s3-demo-bucket",
                    "Prefix": "ledgerexport1/",
                    "EncryptionConfiguration": {
                        "ObjectEncryptionType": "SSE_S3"
                    }
                },
                "ExportId": "ADR2ONPKN5LINYGb4dp7yZ",
                "RoleArn": "arn:aws:iam::123456789012:role/qldb-s3-export",
                "InclusiveStartTime": 1568764800.0,
                "Status": "IN_PROGRESS"
            }
        ]
    }

For more information, see `Exporting Your Journal in Amazon QLDB <https://docs.aws.amazon.com/qldb/latest/developerguide/export-journal.html>`__ in the *Amazon QLDB Developer Guide*.