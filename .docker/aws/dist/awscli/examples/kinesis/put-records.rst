**To write multiple records into a data stream**

The following ``put-records`` example writes a data record using the specified partition key and another data record using a different partition key in a single call. ::

    aws kinesis put-records \
        --stream-name samplestream \
        --records Data=blob1,PartitionKey=partitionkey1 Data=blob2,PartitionKey=partitionkey2

Output::

    {
        "FailedRecordCount": 0,
        "Records": [
            {
                "SequenceNumber": "49600883331171471519674795588238531498465399900093808706",
                "ShardId": "shardId-000000000004"
            },
            {
                "SequenceNumber": "49600902273357540915989931256902715169698037101720764562",
                "ShardId": "shardId-000000000009"
            }
        ],
        "EncryptionType": "KMS"
    }

For more information, see `Developing Producers Using the Amazon Kinesis Data Streams API with the AWS SDK for Java <https://docs.aws.amazon.com/streams/latest/dev/developing-producers-with-sdk.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.
