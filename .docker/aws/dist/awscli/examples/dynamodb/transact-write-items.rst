**Example 1: To write items atomically to one or more tables**

The following ``transact-write-items`` example updates one item and deletes another. The operation fails if either operation fails, or if either item contains a ``Rating`` attribute. ::

    aws dynamodb transact-write-items \
        --transact-items file://transact-items.json \
        --return-consumed-capacity TOTAL \
        --return-item-collection-metrics SIZE

Contents of the ``transact-items.json`` file::

    [
        {
            "Update": {
                "Key": {
                    "Artist": {"S": "Acme Band"},
                    "SongTitle": {"S": "Happy Day"}
                },
                "UpdateExpression": "SET AlbumTitle = :newval",
                "ExpressionAttributeValues": {
                    ":newval": {"S": "Updated Album Title"}
                },
                "TableName": "MusicCollection",
                "ConditionExpression": "attribute_not_exists(Rating)"
            }
        },
        {
            "Delete": {
                "Key": {
                    "Artist": {"S": "No One You Know"},
                    "SongTitle": {"S": "Call Me Today"}
                },
                "TableName": "MusicCollection",
                "ConditionExpression": "attribute_not_exists(Rating)"
            }
        }
    ]

Output::

    {
        "ConsumedCapacity": [
            {
                "TableName": "MusicCollection",
                "CapacityUnits": 10.0,
                "WriteCapacityUnits": 10.0
            }
        ],
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
        }
    }

For more information, see `Managing Complex Workflows with DynamoDB Transactions <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transactions.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 2: To write items atomically using a client request token**

The following command uses a client request token to make the call to ``transact-write-items`` idempotent, meaning that multiple calls have the same effect as one single call. ::

    aws dynamodb transact-write-items \
        --transact-items file://transact-items.json \
        --client-request-token abc123

Contents of the ``transact-items.json`` file::

    [
        {
            "Update": {
                "Key": {
                    "Artist": {"S": "Acme Band"},
                    "SongTitle": {"S": "Happy Day"}
                },
                "UpdateExpression": "SET AlbumTitle = :newval",
                "ExpressionAttributeValues": {
                    ":newval": {"S": "Updated Album Title"}
                },
                "TableName": "MusicCollection",
                "ConditionExpression": "attribute_not_exists(Rating)"
            }
        },
        {
            "Delete": {
                "Key": {
                    "Artist": {"S": "No One You Know"},
                    "SongTitle": {"S": "Call Me Today"}
                },
                "TableName": "MusicCollection",
                "ConditionExpression": "attribute_not_exists(Rating)"
            }
        }
    ]

This command produces no output.

For more information, see `Managing Complex Workflows with DynamoDB Transactions <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transactions.html>`__ in the *Amazon DynamoDB Developer Guide*.