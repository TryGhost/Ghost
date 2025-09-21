**To list data streams**

The following ``list-streams`` example lists all active data streams in the current account and region. ::

    aws kinesis list-streams

Output::

    {
        "StreamNames": [
            "samplestream",
            "samplestream1"
        ]
    }

For more information, see `Listing Streams <https://docs.aws.amazon.com/streams/latest/dev/kinesis-using-sdk-java-list-streams.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.
