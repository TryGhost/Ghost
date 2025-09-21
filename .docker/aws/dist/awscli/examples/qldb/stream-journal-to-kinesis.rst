**Example 1: To stream journal data to Kinesis Data Streams using input files**

The following ``stream-journal-to-kinesis`` example creates a stream of journal data within a specified date and time range from a ledger with the name ``myExampleLedger``. The stream sends the data to a specified Amazon Kinesis data stream. ::

    aws qldb stream-journal-to-kinesis \
        --ledger-name myExampleLedger \
        --inclusive-start-time 2020-05-29T00:00:00Z \
        --exclusive-end-time 2020-05-29T23:59:59Z \
        --role-arn arn:aws:iam::123456789012:role/my-kinesis-stream-role \
        --kinesis-configuration file://my-kinesis-config.json \
        --stream-name myExampleLedger-stream

Contents of ``my-kinesis-config.json``::

    {
        "StreamArn": "arn:aws:kinesis:us-east-1:123456789012:stream/stream-for-qldb",
        "AggregationEnabled": true
    }

Output::

    {
        "StreamId": "7ISCkqwe4y25YyHLzYUFAf"
    }

For more information, see `Streaming journal data from Amazon QLDB <https://docs.aws.amazon.com/qldb/latest/developerguide/streams.html>`__ in the *Amazon QLDB Developer Guide*.

**Example 2: To stream journal data to Kinesis Data Streams using shorthand syntax**

The following ``stream-journal-to-kinesis`` example creates a stream of journal data within a specified date and time range from a ledger with the name ``myExampleLedger``. The stream sends the data to a specified Amazon Kinesis data stream. ::

    aws qldb stream-journal-to-kinesis \
        --ledger-name myExampleLedger \
        --inclusive-start-time 2020-05-29T00:00:00Z \
        --exclusive-end-time 2020-05-29T23:59:59Z \
        --role-arn arn:aws:iam::123456789012:role/my-kinesis-stream-role \
        --stream-name myExampleLedger-stream \
        --kinesis-configuration StreamArn=arn:aws:kinesis:us-east-1:123456789012:stream/stream-for-qldb,AggregationEnabled=true

Output::

    {
        "StreamId": "7ISCkqwe4y25YyHLzYUFAf"
    }

For more information, see `Streaming journal data from Amazon QLDB <https://docs.aws.amazon.com/qldb/latest/developerguide/streams.html>`__ in the *Amazon QLDB Developer Guide*.
