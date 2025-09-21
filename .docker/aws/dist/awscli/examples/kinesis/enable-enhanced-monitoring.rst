**To enable enhanced monitoring for shard-level metrics**

The following ``enable-enhanced-monitoring`` example enables enhanced Kinesis data stream monitoring for shard-level metrics. ::

    aws kinesis enable-enhanced-monitoring \
        --stream-name samplestream \
        --shard-level-metrics ALL

Output::

    {
        "StreamName": "samplestream",
        "CurrentShardLevelMetrics": [],
        "DesiredShardLevelMetrics": [
            "IncomingBytes",
            "OutgoingRecords",
            "IteratorAgeMilliseconds",
            "IncomingRecords",
            "ReadProvisionedThroughputExceeded",
            "WriteProvisionedThroughputExceeded",
            "OutgoingBytes"
        ]
    }

For more information, see `Monitoring Streams in Amazon Kinesis Data Streams <https://docs.aws.amazon.com/streams/latest/dev/monitoring.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.
