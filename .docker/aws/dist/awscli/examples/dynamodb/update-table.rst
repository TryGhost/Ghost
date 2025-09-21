**Example 1: To modify a table's billing mode**

The following ``update-table`` example increases the provisioned read and write capacity on the ``MusicCollection`` table. ::

    aws dynamodb update-table \
        --table-name MusicCollection \
        --billing-mode PROVISIONED \
        --provisioned-throughput ReadCapacityUnits=15,WriteCapacityUnits=10 

Output::

    {
        "TableDescription": {
            "AttributeDefinitions": [
                {
                    "AttributeName": "AlbumTitle",
                    "AttributeType": "S"
                },
                {
                    "AttributeName": "Artist",
                    "AttributeType": "S"
                },
                {
                    "AttributeName": "SongTitle",
                    "AttributeType": "S"
                }
            ],
            "TableName": "MusicCollection",
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
            "TableStatus": "UPDATING",
            "CreationDateTime": "2020-05-26T15:59:49.473000-07:00",
            "ProvisionedThroughput": {
                "LastIncreaseDateTime": "2020-07-28T13:18:18.921000-07:00",
                "NumberOfDecreasesToday": 0,
                "ReadCapacityUnits": 15,
                "WriteCapacityUnits": 10
            },
            "TableSizeBytes": 182,
            "ItemCount": 2,
            "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection",
            "TableId": "abcd0123-01ab-23cd-0123-abcdef123456",
            "BillingModeSummary": {
                "BillingMode": "PROVISIONED",
                "LastUpdateToPayPerRequestDateTime": "2020-07-28T13:14:48.366000-07:00"
            }
        }
    }

For more information, see `Updating a Table <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html#WorkingWithTables.Basics.UpdateTable>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 2: To create a global secondary index**

The following example adds a global secondary index to the ``MusicCollection`` table. ::

    aws dynamodb update-table \
        --table-name MusicCollection \
        --attribute-definitions AttributeName=AlbumTitle,AttributeType=S \
        --global-secondary-index-updates file://gsi-updates.json

Contents of ``gsi-updates.json``::

    [
        {
            "Create": {
                "IndexName": "AlbumTitle-index",
                "KeySchema": [
                    {
                        "AttributeName": "AlbumTitle",
                        "KeyType": "HASH"
                    }
                ],
                "ProvisionedThroughput": {
                    "ReadCapacityUnits": 10,
                    "WriteCapacityUnits": 10
                },
                "Projection": {
                    "ProjectionType": "ALL"
                }
            }
        }
    ]

Output::

    {
        "TableDescription": {
            "AttributeDefinitions": [
                {
                    "AttributeName": "AlbumTitle",
                    "AttributeType": "S"
                },
                {
                    "AttributeName": "Artist",
                    "AttributeType": "S"
                },
                {
                    "AttributeName": "SongTitle",
                    "AttributeType": "S"
                }
            ],
            "TableName": "MusicCollection",
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
            "TableStatus": "UPDATING",
            "CreationDateTime": "2020-05-26T15:59:49.473000-07:00",
            "ProvisionedThroughput": {
                "LastIncreaseDateTime": "2020-07-28T12:59:17.537000-07:00",
                "NumberOfDecreasesToday": 0,
                "ReadCapacityUnits": 15,
                "WriteCapacityUnits": 10
            },
            "TableSizeBytes": 182,
            "ItemCount": 2,
            "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection",
            "TableId": "abcd0123-01ab-23cd-0123-abcdef123456",
            "BillingModeSummary": {
                "BillingMode": "PROVISIONED",
                "LastUpdateToPayPerRequestDateTime": "2020-07-28T13:14:48.366000-07:00"
            },
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "AlbumTitle-index",
                    "KeySchema": [
                        {
                            "AttributeName": "AlbumTitle",
                            "KeyType": "HASH"
                        }
                    ],
                    "Projection": {
                        "ProjectionType": "ALL"
                    },
                    "IndexStatus": "CREATING",
                    "Backfilling": false,
                    "ProvisionedThroughput": {
                        "NumberOfDecreasesToday": 0,
                        "ReadCapacityUnits": 10,
                        "WriteCapacityUnits": 10
                    },
                    "IndexSizeBytes": 0,
                    "ItemCount": 0,
                    "IndexArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/index/AlbumTitle-index"
                }
            ]
        }
    }

For more information, see `Updating a Table <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html#WorkingWithTables.Basics.UpdateTable>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 3: To enable DynamoDB Streams on a table**

The following command enables DynamoDB Streams on the ``MusicCollection`` table. ::

    aws dynamodb update-table \
        --table-name MusicCollection \
        --stream-specification StreamEnabled=true,StreamViewType=NEW_IMAGE

Output::

    {
        "TableDescription": {
            "AttributeDefinitions": [
                {
                    "AttributeName": "AlbumTitle",
                    "AttributeType": "S"
                },
                {
                    "AttributeName": "Artist",
                    "AttributeType": "S"
                },
                {
                    "AttributeName": "SongTitle",
                    "AttributeType": "S"
                }
            ],
            "TableName": "MusicCollection",
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
            "TableStatus": "UPDATING",
            "CreationDateTime": "2020-05-26T15:59:49.473000-07:00",
            "ProvisionedThroughput": {
                "LastIncreaseDateTime": "2020-07-28T12:59:17.537000-07:00",
                "NumberOfDecreasesToday": 0,
                "ReadCapacityUnits": 15,
                "WriteCapacityUnits": 10
            },
            "TableSizeBytes": 182,
            "ItemCount": 2,
            "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection",
            "TableId": "abcd0123-01ab-23cd-0123-abcdef123456",
            "BillingModeSummary": {
                "BillingMode": "PROVISIONED",
                "LastUpdateToPayPerRequestDateTime": "2020-07-28T13:14:48.366000-07:00"
            },
            "LocalSecondaryIndexes": [
                {
                    "IndexName": "AlbumTitleIndex",
                    "KeySchema": [
                        {
                            "AttributeName": "Artist",
                            "KeyType": "HASH"
                        },
                        {
                            "AttributeName": "AlbumTitle",
                            "KeyType": "RANGE"
                        }
                    ],
                    "Projection": {
                        "ProjectionType": "INCLUDE",
                        "NonKeyAttributes": [
                            "Year",
                            "Genre"
                        ]
                    },
                    "IndexSizeBytes": 139,
                    "ItemCount": 2,
                    "IndexArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/index/AlbumTitleIndex"
                }
            ],
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "AlbumTitle-index",
                    "KeySchema": [
                        {
                            "AttributeName": "AlbumTitle",
                            "KeyType": "HASH"
                        }
                    ],
                    "Projection": {
                        "ProjectionType": "ALL"
                    },
                    "IndexStatus": "ACTIVE",
                    "ProvisionedThroughput": {
                        "NumberOfDecreasesToday": 0,
                        "ReadCapacityUnits": 10,
                        "WriteCapacityUnits": 10
                    },
                    "IndexSizeBytes": 0,
                    "ItemCount": 0,
                    "IndexArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/index/AlbumTitle-index"
                }
            ],
            "StreamSpecification": {
                "StreamEnabled": true,
                "StreamViewType": "NEW_IMAGE"
            },
            "LatestStreamLabel": "2020-07-28T21:53:39.112",
            "LatestStreamArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/stream/2020-07-28T21:53:39.112"
        }
    }

For more information, see `Updating a Table <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html#WorkingWithTables.Basics.UpdateTable>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 4: To enable server-side encryption**

The following example enables server-side encryption on the ``MusicCollection`` table. ::

    aws dynamodb update-table \
        --table-name MusicCollection \
        --sse-specification Enabled=true,SSEType=KMS

Output::

    {
        "TableDescription": {
            "AttributeDefinitions": [
                {
                    "AttributeName": "AlbumTitle",
                    "AttributeType": "S"
                },
                {
                    "AttributeName": "Artist",
                    "AttributeType": "S"
                },
                {
                    "AttributeName": "SongTitle",
                    "AttributeType": "S"
                }
            ],
            "TableName": "MusicCollection",
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
            "TableStatus": "ACTIVE",
            "CreationDateTime": "2020-05-26T15:59:49.473000-07:00",
            "ProvisionedThroughput": {
                "LastIncreaseDateTime": "2020-07-28T12:59:17.537000-07:00",
                "NumberOfDecreasesToday": 0,
                "ReadCapacityUnits": 15,
                "WriteCapacityUnits": 10
            },
            "TableSizeBytes": 182,
            "ItemCount": 2,
            "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection",
            "TableId": "abcd0123-01ab-23cd-0123-abcdef123456",
            "BillingModeSummary": {
                "BillingMode": "PROVISIONED",
                "LastUpdateToPayPerRequestDateTime": "2020-07-28T13:14:48.366000-07:00"
            },
            "LocalSecondaryIndexes": [
                {
                    "IndexName": "AlbumTitleIndex",
                    "KeySchema": [
                        {
                            "AttributeName": "Artist",
                            "KeyType": "HASH"
                        },
                        {
                            "AttributeName": "AlbumTitle",
                            "KeyType": "RANGE"
                        }
                    ],
                    "Projection": {
                        "ProjectionType": "INCLUDE",
                        "NonKeyAttributes": [
                            "Year",
                            "Genre"
                        ]
                    },
                    "IndexSizeBytes": 139,
                    "ItemCount": 2,
                    "IndexArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/index/AlbumTitleIndex"
                }
            ],
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "AlbumTitle-index",
                    "KeySchema": [
                        {
                            "AttributeName": "AlbumTitle",
                            "KeyType": "HASH"
                        }
                    ],
                    "Projection": {
                        "ProjectionType": "ALL"
                    },
                    "IndexStatus": "ACTIVE",
                    "ProvisionedThroughput": {
                        "NumberOfDecreasesToday": 0,
                        "ReadCapacityUnits": 10,
                        "WriteCapacityUnits": 10
                    },
                    "IndexSizeBytes": 0,
                    "ItemCount": 0,
                    "IndexArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/index/AlbumTitle-index"
                }
            ],
            "StreamSpecification": {
                "StreamEnabled": true,
                "StreamViewType": "NEW_IMAGE"
            },
            "LatestStreamLabel": "2020-07-28T21:53:39.112",
            "LatestStreamArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/stream/2020-07-28T21:53:39.112",
            "SSEDescription": {
                "Status": "UPDATING"
            }
        }
    }

For more information, see `Updating a Table <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html#WorkingWithTables.Basics.UpdateTable>`__ in the *Amazon DynamoDB Developer Guide*.