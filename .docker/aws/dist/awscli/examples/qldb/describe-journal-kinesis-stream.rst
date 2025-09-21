**To describe a journal stream**

The following ``describe-journal-kinesis-stream`` example displays the details for the specified journal stream from a ledger. ::

    aws qldb describe-journal-kinesis-stream \
        --ledger-name myExampleLedger \
        --stream-id 7ISCkqwe4y25YyHLzYUFAf

Output::

    {
        "Stream": {
            "LedgerName": "myExampleLedger",
            "CreationTime": 1591221984.677,
            "InclusiveStartTime": 1590710400.0,
            "ExclusiveEndTime": 1590796799.0,
            "RoleArn": "arn:aws:iam::123456789012:role/my-kinesis-stream-role",
            "StreamId": "7ISCkqwe4y25YyHLzYUFAf",
            "Arn": "arn:aws:qldb:us-east-1:123456789012:stream/myExampleLedger/7ISCkqwe4y25YyHLzYUFAf",
            "Status": "ACTIVE",
            "KinesisConfiguration": {
                "StreamArn": "arn:aws:kinesis:us-east-1:123456789012:stream/stream-for-qldb",
                "AggregationEnabled": true
            },
            "StreamName": "myExampleLedger-stream"
        }
    }

For more information, see `Streaming journal data from Amazon QLDB <https://docs.aws.amazon.com/qldb/latest/developerguide/streams.html>`__ in the *Amazon QLDB Developer Guide*.
