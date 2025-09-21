**To retrieve multiple items from a table**

The following ``batch-get-items`` example reads multiple items from the ``MusicCollection`` table using a batch of three ``GetItem`` requests, and requests the number of read capacity units consumed by the operation. The command returns only the ``AlbumTitle`` attribute. ::

    aws dynamodb batch-get-item \
        --request-items file://request-items.json \
        --return-consumed-capacity TOTAL

Contents of ``request-items.json``::

    {
        "MusicCollection": {
            "Keys": [
                {
                    "Artist": {"S": "No One You Know"},
                    "SongTitle": {"S": "Call Me Today"}
                },
                {
                    "Artist": {"S": "Acme Band"},
                    "SongTitle": {"S": "Happy Day"}
                },
                {
                    "Artist": {"S": "No One You Know"},
                    "SongTitle": {"S": "Scared of My Shadow"}
                }
            ],
            "ProjectionExpression":"AlbumTitle"
        }
    }

Output::

    {
        "Responses": {
            "MusicCollection": [
                {
                    "AlbumTitle": {
                        "S": "Somewhat Famous"
                    }
                }, 
                {
                    "AlbumTitle": {
                        "S": "Blue Sky Blues"
                    }
                }, 
                {
                    "AlbumTitle": {
                        "S": "Louder Than Ever"
                    }
                }
            ]
        },
        "UnprocessedKeys": {}, 
        "ConsumedCapacity": [
            {
                "TableName": "MusicCollection",
                "CapacityUnits": 1.5
            }
        ]
    }

For more information, see `Batch Operations <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.BatchOperations>`__ in the *Amazon DynamoDB Developer Guide*.
