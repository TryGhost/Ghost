**To update the shard count in a data stream**

The following ``update-shard-count`` example updates the shard count of the specified data stream to 6. This example uses uniform scaling, which creates shards of equal size. ::

    aws kinesis update-shard-count \
        --stream-name samplestream \
        --scaling-type UNIFORM_SCALING \
        --target-shard-count 6

Output::

    {
        "StreamName": "samplestream",
        "CurrentShardCount": 3,
        "TargetShardCount": 6
    }

For more information, see `Resharding a Stream <https://docs.aws.amazon.com/streams/latest/dev/kinesis-using-sdk-java-resharding.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.
