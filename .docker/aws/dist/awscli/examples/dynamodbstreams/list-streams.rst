**To list DynamoDB streams**

The following ``list-streams`` command lists all existing Amazon DynamoDB streams within the default AWS Region. ::

    aws dynamodbstreams list-streams

Output::

    {
        "Streams": [
            {
                "StreamArn": "arn:aws:dynamodb:us-west-1:123456789012:table/Music/stream/2019-10-22T18:02:01.576",
                "TableName": "Music",
                "StreamLabel": "2019-10-22T18:02:01.576"
            }
        ]
    }

For more information, see `Capturing Table Activity with DynamoDB Streams <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html>`__ in the *Amazon DynamoDB Developer Guide*.
