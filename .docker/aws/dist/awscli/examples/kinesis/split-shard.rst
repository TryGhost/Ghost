**To split shards**

The following ``split-shard`` example splits the specified shard into two new shards using a new starting hash key of 10. ::

    aws kinesis split-shard \
        --stream-name samplestream \
        --shard-to-split shardId-000000000000 \
        --new-starting-hash-key 10

This command produces no output.

For more information, see `Splitting a Shard <https://docs.aws.amazon.com/streams/latest/dev/kinesis-using-sdk-java-resharding-split.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.
