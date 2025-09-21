**To disable enhanced monitoring for shard-level metrics**

The following ``disable-enhanced-monitoring`` example disables enhanced Kinesis data stream monitoring for shard-level metrics. ::

    aws kinesis disable-enhanced-monitoring \
        --stream-name samplestream --shard-level-metrics ALL

Output::

    {
        "StreamName": "samplestream",
        "CurrentShardLevelMetrics": [
            "IncomingBytes",
            "OutgoingRecords",
            "IteratorAgeMilliseconds",
            "IncomingRecords",
            "ReadProvisionedThroughputExceeded",
            "WriteProvisionedThroughputExceeded",
            "OutgoingBytes"
        ],
        "DesiredShardLevelMetrics": []
    }

For more information, see `Monitoring Streams in Amazon Kinesis Data Streams <https://docs.aws.amazon.com/streams/latest/dev/monitoring.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.
