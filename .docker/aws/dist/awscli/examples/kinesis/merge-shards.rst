**To merge shards**

The following ``merge-shards`` example merges two adjacent shards with IDs of shardId-000000000000  and shardId-000000000001 in the specified data stream and combines them into a single shard. ::

    aws kinesis merge-shards \
        --stream-name samplestream \
        --shard-to-merge shardId-000000000000 \
        --adjacent-shard-to-merge shardId-000000000001

This command produces no output.

For more information, see `Merging Two Shards <https://docs.aws.amazon.com/streams/latest/dev/kinesis-using-sdk-java-resharding-merge.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.
