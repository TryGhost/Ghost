**To get information about a DynamoDB stream**

The following ``describe-stream`` command displays information about the specific DynamoDB stream. ::

    aws dynamodbstreams describe-stream \
        --stream-arn arn:aws:dynamodb:us-west-1:123456789012:table/Music/stream/2019-10-22T18:02:01.576

Output::

    {
        "StreamDescription": {
            "StreamArn": "arn:aws:dynamodb:us-west-1:123456789012:table/Music/stream/2019-10-22T18:02:01.576",
            "StreamLabel": "2019-10-22T18:02:01.576",
            "StreamStatus": "ENABLED",
            "StreamViewType": "NEW_AND_OLD_IMAGES",
            "CreationRequestDateTime": 1571767321.571,
            "TableName": "Music",
            "KeySchema": [
                {
                    "AttributeName": "Artist",
                    "KeyType": "HASH"
                },
                {
                    "AttributeName": "SongTitle",
                    "KeyType": "RANGE"
                }
            ],
            "Shards": [
                {
                    "ShardId": "shardId-00000001571767321804-697ce3d2",
                    "SequenceNumberRange": {
                        "StartingSequenceNumber": "4000000000000642977831",
                        "EndingSequenceNumber": "4000000000000642977831"
                    }
                },
                {
                    "ShardId": "shardId-00000001571780995058-40810d86",
                    "SequenceNumberRange": {
                        "StartingSequenceNumber": "757400000000005655171150"
                    },
                    "ParentShardId": "shardId-00000001571767321804-697ce3d2"
                }
            ]
        }
    }

For more information, see `Capturing Table Activity with DynamoDB Streams <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html>`__ in the *Amazon DynamoDB Developer Guide*.
