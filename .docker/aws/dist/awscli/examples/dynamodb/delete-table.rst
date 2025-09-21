**To delete a table**

The following ``delete-table`` example deletes the ``MusicCollection`` table. ::

    aws dynamodb delete-table \
        --table-name MusicCollection

Output::

    {
        "TableDescription": {
            "TableStatus": "DELETING", 
            "TableSizeBytes": 0, 
            "ItemCount": 0, 
            "TableName": "MusicCollection", 
            "ProvisionedThroughput": {
                "NumberOfDecreasesToday": 0, 
                "WriteCapacityUnits": 5, 
                "ReadCapacityUnits": 5
            }
        }
    }

For more information, see `Deleting a Table <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html#WorkingWithTables.Basics.DeleteTable>`__ in the *Amazon DynamoDB Developer Guide*.
