**To export journal blocks to S3**

The following ``export-journal-to-s3`` example creates an export job for journal blocks within a specified date and time range from a ledger with the name ``myExampleLedger``. The export job writes the blocks into a specified Amazon S3 bucket. ::

    aws qldb export-journal-to-s3 \
        --name myExampleLedger \
        --inclusive-start-time 2019-09-18T00:00:00Z \
        --exclusive-end-time 2019-09-18T22:59:59Z \
        --role-arn arn:aws:iam::123456789012:role/my-s3-export-role \
        --s3-export-configuration file://my-s3-export-config.json

Contents of ``my-s3-export-config.json``::

    {
        "Bucket": "amzn-s3-demo-bucket",
        "Prefix": "ledgerexport1/",
        "EncryptionConfiguration": {
            "ObjectEncryptionType": "SSE_S3"
        }
    }

Output::

    {
        "ExportId": "ADR2ONPKN5LINYGb4dp7yZ"
    }

For more information, see `Exporting Your Journal in Amazon QLDB <https://docs.aws.amazon.com/qldb/latest/developerguide/export-journal.html>`__ in the *Amazon QLDB Developer Guide*.
