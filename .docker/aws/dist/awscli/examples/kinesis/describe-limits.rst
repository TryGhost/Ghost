**To describe shard limits**

The following ``describe-limits`` example displays the shard limits and usage for the current AWS account. ::

    aws kinesis describe-limits

Output::

    {
        "ShardLimit": 500,
        "OpenShardCount": 29
    }

For more information, see `Resharding a Stream <https://docs.aws.amazon.com/streams/latest/dev/kinesis-using-sdk-java-resharding.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.
