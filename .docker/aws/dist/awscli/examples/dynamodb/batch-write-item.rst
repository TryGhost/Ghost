**To add multiple items to a table**

The following ``batch-write-item`` example adds three new items to the ``MusicCollection`` table using a batch of three ``PutItem`` requests. It also requests information about the number of write capacity units consumed by the operation and any item collections modified by the operation. ::

    aws dynamodb batch-write-item \
        --request-items file://request-items.json \
        --return-consumed-capacity INDEXES \
        --return-item-collection-metrics SIZE

Contents of ``request-items.json``::

    {
        "MusicCollection": [
            { 
                "PutRequest": {
                    "Item": {
                        "Artist": {"S": "No One You Know"},
                        "SongTitle": {"S": "Call Me Today"},
                        "AlbumTitle": {"S": "Somewhat Famous"}
                    }
                }
            },
            {
                "PutRequest": {
                    "Item": {
                        "Artist": {"S": "Acme Band"},
                        "SongTitle": {"S": "Happy Day"},
                        "AlbumTitle": {"S": "Songs About Life"}
                    }
                }
            },
            {
                "PutRequest": {
                    "Item": {
                        "Artist": {"S": "No One You Know"},
                        "SongTitle": {"S": "Scared of My Shadow"},
                        "AlbumTitle": {"S": "Blue Sky Blues"}
                    }
                }
            }
        ]
    }

Output::

    {
        "UnprocessedItems": {},
        "ItemCollectionMetrics": {
            "MusicCollection": [
                {
                    "ItemCollectionKey": {
                        "Artist": {
                            "S": "No One You Know"
                        }
                    },
                    "SizeEstimateRangeGB": [
                        0.0,
                        1.0
                    ]
                },
                {
                    "ItemCollectionKey": {
                        "Artist": {
                            "S": "Acme Band"
                        }
                    },
                    "SizeEstimateRangeGB": [
                        0.0,
                        1.0
                    ]
                }
            ]
        },
        "ConsumedCapacity": [
            {
                "TableName": "MusicCollection",
                "CapacityUnits": 6.0,
                "Table": {
                    "CapacityUnits": 3.0
                },
                "LocalSecondaryIndexes": {
                    "AlbumTitleIndex": {
                        "CapacityUnits": 3.0
                    }
                }
            }
        ]
    }

For more information, see `Batch Operations <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.BatchOperations>`__ in the *Amazon DynamoDB Developer Guide*.
