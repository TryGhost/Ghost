**To describe a data stream summary**

The following ``describe-stream-summary`` example provides a summarized description (without the shard list) of the specified data stream. ::

    aws kinesis describe-stream-summary \
        --stream-name samplestream

Output::

    {
        "StreamDescriptionSummary": {
            "StreamName": "samplestream",
            "StreamARN": "arn:aws:kinesis:us-west-2:123456789012:stream/samplestream",
            "StreamStatus": "ACTIVE",
            "RetentionPeriodHours": 48,
            "StreamCreationTimestamp": 1572297168.0,
            "EnhancedMonitoring": [
                {
                    "ShardLevelMetrics": []
                }
            ],
            "EncryptionType": "NONE",
            "OpenShardCount": 3,
            "ConsumerCount": 0
        }
    }

For more information, see `Creating and Managing Streams <https://docs.aws.amazon.com/streams/latest/dev/working-with-streams.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.
