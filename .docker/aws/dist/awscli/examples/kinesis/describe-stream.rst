**To describe a data stream**

The following ``describe-stream`` example returns the details of the specified data stream. ::

    aws kinesis describe-stream \
        --stream-name samplestream

Output::

    {
        "StreamDescription": {
            "Shards": [
                {
                    "ShardId": "shardId-000000000000",
                    "HashKeyRange": {
                        "StartingHashKey": "0",
                        "EndingHashKey": "113427455640312821154458202477256070484"
                    },
                    "SequenceNumberRange": {
                        "StartingSequenceNumber": "49600871682957036442365024926191073437251060580128653314"
                    }
                },
                {
                    "ShardId": "shardId-000000000001",
                    "HashKeyRange": {
                        "StartingHashKey": "113427455640312821154458202477256070485",
                        "EndingHashKey": "226854911280625642308916404954512140969"
                    },
                    "SequenceNumberRange": {
                        "StartingSequenceNumber": "49600871682979337187563555549332609155523708941634633746"
                    }
                },
                {
                    "ShardId": "shardId-000000000002",
                    "HashKeyRange": {
                        "StartingHashKey": "226854911280625642308916404954512140970",
                        "EndingHashKey": "340282366920938463463374607431768211455"
                    },
                    "SequenceNumberRange": {
                        "StartingSequenceNumber": "49600871683001637932762086172474144873796357303140614178"
                    }
                }
            ],
            "StreamARN": "arn:aws:kinesis:us-west-2:123456789012:stream/samplestream",
            "StreamName": "samplestream",
            "StreamStatus": "ACTIVE",
            "RetentionPeriodHours": 24,
            "EnhancedMonitoring": [
                {
                    "ShardLevelMetrics": []
                }
            ],
            "EncryptionType": "NONE",
            "KeyId": null,
            "StreamCreationTimestamp": 1572297168.0
        }
    }


For more information, see `Creating and Managing Streams <https://docs.aws.amazon.com/streams/latest/dev/working-with-streams.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.
