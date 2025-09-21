**To obtain a shard iterator**

The following ``get-shard-iterator`` example uses the ``AT_SEQUENCE_NUMBER`` shard iterator type and generates a shard iterator to start reading data records exactly from the position denoted by the specified sequence number. ::

    aws kinesis get-shard-iterator \
        --stream-name samplestream \
        --shard-id shardId-000000000001 \
        --shard-iterator-type LATEST

Output::

    {
        "ShardIterator": "AAAAAAAAAAFEvJjIYI+3jw/4aqgH9FifJ+n48XWTh/IFIsbILP6o5eDueD39NXNBfpZ10WL5K6ADXk8w+5H+Qhd9cFA9k268CPXCz/kebq1TGYI7Vy+lUkA9BuN3xvATxMBGxRY3zYK05gqgvaIRn94O8SqeEqwhigwZxNWxID3Ej7YYYcxQi8Q/fIrCjGAy/n2r5Z9G864YpWDfN9upNNQAR/iiOWKs"
    }

For more information, see `Developing Consumers Using the Kinesis Data Streams API with the AWS SDK for Java <https://docs.aws.amazon.com/streams/latest/dev/developing-consumers-with-sdk.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.
