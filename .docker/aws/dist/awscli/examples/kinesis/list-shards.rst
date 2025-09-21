**To list shards in a data stream**

The following ``list-shards`` example lists all shards in the specified stream starting with the shard whose ID immediately follows the specified ``exclusive-start-shard-id`` of ``shardId-000000000000``. ::

    aws kinesis list-shards \
        --stream-name samplestream \
        --exclusive-start-shard-id shardId-000000000000

Output::

    {
        "Shards": [
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
        ]
    }

For more information, see `Listing Shards <https://docs.aws.amazon.com/streams/latest/dev/kinesis-using-sdk-java-list-shards.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.