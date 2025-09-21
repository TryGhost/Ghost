**To write a record into a data stream**

The following ``put-record`` example writes a single data record into the specified data stream using the specified partition key. ::

    aws kinesis put-record \
        --stream-name samplestream \
        --data sampledatarecord \
        --partition-key samplepartitionkey

Output::

    {
        "ShardId": "shardId-000000000009",
        "SequenceNumber": "49600902273357540915989931256901506243878407835297513618",
        "EncryptionType": "KMS"
    }

For more information, see `Developing Producers Using the Amazon Kinesis Data Streams API with the AWS SDK for Java <https://docs.aws.amazon.com/streams/latest/dev/developing-producers-with-sdk.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.
