**To create a data stream**

The following ``create-stream`` example creates a data stream named samplestream with 3 shards. ::

    aws kinesis create-stream \
        --stream-name samplestream \
        --shard-count 3

This command produces no output.

For more information, see `Creating a Stream <https://docs.aws.amazon.com/streams/latest/dev/kinesis-using-sdk-java-create-stream.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.