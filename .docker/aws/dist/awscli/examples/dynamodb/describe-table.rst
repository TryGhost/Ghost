**To describe a table**

The following ``describe-table`` example describes the ``MusicCollection`` table. ::

    aws dynamodb describe-table \
        --table-name MusicCollection

Output::

    {
        "Table": {
            "AttributeDefinitions": [
                {
                    "AttributeName": "Artist", 
                    "AttributeType": "S"
                }, 
                {
                    "AttributeName": "SongTitle", 
                    "AttributeType": "S"
                }
            ], 
            "ProvisionedThroughput": {
                "NumberOfDecreasesToday": 0, 
                "WriteCapacityUnits": 5, 
                "ReadCapacityUnits": 5
            }, 
            "TableSizeBytes": 0, 
            "TableName": "MusicCollection", 
            "TableStatus": "ACTIVE", 
            "KeySchema": [
                {
                    "KeyType": "HASH", 
                    "AttributeName": "Artist"
                }, 
                {
                    "KeyType": "RANGE", 
                    "AttributeName": "SongTitle"
                }
            ], 
            "ItemCount": 0, 
            "CreationDateTime": 1421866952.062
        }
    }

For more information, see `Describing a Table <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html#WorkingWithTables.Basics.DescribeTable>`__ in the *Amazon DynamoDB Developer Guide*.
