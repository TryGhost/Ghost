**Example 1: To create a table with tags**

The following ``create-table`` example uses the specified attributes and key schema to create a table named ``MusicCollection``. This table uses provisioned throughput and is encrypted at rest using the default AWS owned CMK. The command also applies a tag to the table, with a key of ``Owner`` and a value of ``blueTeam``. ::

    aws dynamodb create-table \
        --table-name MusicCollection \
        --attribute-definitions AttributeName=Artist,AttributeType=S AttributeName=SongTitle,AttributeType=S \
        --key-schema AttributeName=Artist,KeyType=HASH AttributeName=SongTitle,KeyType=RANGE \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --tags Key=Owner,Value=blueTeam

Output::

    {
        "TableDescription": {
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
            "TableStatus": "CREATING", 
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
            "CreationDateTime": "2020-05-26T16:04:41.627000-07:00",
            "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection",
            "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
        }
    }

For more information, see `Basic Operations for Tables <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 2: To create a table in On-Demand Mode**

The following example creates a table called ``MusicCollection`` using on-demand mode, rather than provisioned throughput mode. This is useful for tables with unpredictable workloads. ::

    aws dynamodb create-table \
        --table-name MusicCollection \
        --attribute-definitions AttributeName=Artist,AttributeType=S AttributeName=SongTitle,AttributeType=S \
        --key-schema AttributeName=Artist,KeyType=HASH AttributeName=SongTitle,KeyType=RANGE \
        --billing-mode PAY_PER_REQUEST

Output::

    {
        "TableDescription": {
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
            "TableStatus": "CREATING",
            "CreationDateTime": "2020-05-27T11:44:10.807000-07:00",
            "ProvisionedThroughput": {
                "NumberOfDecreasesToday": 0,
                "ReadCapacityUnits": 0,
                "WriteCapacityUnits": 0
            },
            "TableSizeBytes": 0,
            "ItemCount": 0,
            "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection",
            "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "BillingModeSummary": {
                "BillingMode": "PAY_PER_REQUEST"
            }
        }
    }

For more information, see `Basic Operations for Tables <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 3: To create a table and encrypt it with a Customer Managed CMK**

The following example creates a table named ``MusicCollection`` and encrypts it using a customer managed CMK. ::

    aws dynamodb create-table \
        --table-name MusicCollection \
        --attribute-definitions AttributeName=Artist,AttributeType=S AttributeName=SongTitle,AttributeType=S \
        --key-schema AttributeName=Artist,KeyType=HASH AttributeName=SongTitle,KeyType=RANGE \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --sse-specification Enabled=true,SSEType=KMS,KMSMasterKeyId=abcd1234-abcd-1234-a123-ab1234a1b234

Output::

    {
        "TableDescription": {
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
            "TableStatus": "CREATING",
            "CreationDateTime": "2020-05-27T11:12:16.431000-07:00",
            "ProvisionedThroughput": {
                "NumberOfDecreasesToday": 0,
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5
            },
            "TableSizeBytes": 0,
            "ItemCount": 0,
            "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection",
            "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "SSEDescription": {
                "Status": "ENABLED",
                "SSEType": "KMS",
                "KMSMasterKeyArn": "arn:aws:kms:us-west-2:123456789012:key/abcd1234-abcd-1234-a123-ab1234a1b234"
            }
        }
    }

For more information, see `Basic Operations for Tables <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 4: To create a table with a Local Secondary Index**

The following example uses the specified attributes and key schema to create a table named ``MusicCollection`` with a Local Secondary Index named ``AlbumTitleIndex``. ::

    aws dynamodb create-table \
        --table-name MusicCollection \
        --attribute-definitions AttributeName=Artist,AttributeType=S AttributeName=SongTitle,AttributeType=S AttributeName=AlbumTitle,AttributeType=S \
        --key-schema AttributeName=Artist,KeyType=HASH AttributeName=SongTitle,KeyType=RANGE \
        --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5 \
        --local-secondary-indexes \
            "[
                {
                    \"IndexName\": \"AlbumTitleIndex\",
                    \"KeySchema\": [
                        {\"AttributeName\": \"Artist\",\"KeyType\":\"HASH\"},
                        {\"AttributeName\": \"AlbumTitle\",\"KeyType\":\"RANGE\"}
                    ],
                    \"Projection\": {
                        \"ProjectionType\": \"INCLUDE\",
                        \"NonKeyAttributes\": [\"Genre\", \"Year\"]
                    }
                }
            ]" 

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
            "TableStatus": "CREATING",
            "CreationDateTime": "2020-05-26T15:59:49.473000-07:00",
            "ProvisionedThroughput": {
                "NumberOfDecreasesToday": 0,
                "ReadCapacityUnits": 10,
                "WriteCapacityUnits": 5
            },
            "TableSizeBytes": 0,
            "ItemCount": 0,
            "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection",
            "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
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
                            "Genre",
                            "Year"
                        ]
                    },
                    "IndexSizeBytes": 0,
                    "ItemCount": 0,
                    "IndexArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/index/AlbumTitleIndex"
                }
            ]
        }
    }

For more information, see `Basic Operations for Tables <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 5: To create a table with a Global Secondary Index**

The following example creates a table named ``GameScores`` with a Global Secondary Index called ``GameTitleIndex``. The base table has a partition key of ``UserId`` and a sort key of ``GameTitle``, allowing you to find an individual user's best score for a specific game efficiently, whereas the GSI has a partition key of ``GameTitle`` and a sort key of ``TopScore``, allowing you to quickly find the overall highest score for a particular game. ::

    aws dynamodb create-table \
        --table-name GameScores \
        --attribute-definitions AttributeName=UserId,AttributeType=S AttributeName=GameTitle,AttributeType=S AttributeName=TopScore,AttributeType=N \
        --key-schema AttributeName=UserId,KeyType=HASH \
                    AttributeName=GameTitle,KeyType=RANGE \
        --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5 \
        --global-secondary-indexes \
            "[
                {
                    \"IndexName\": \"GameTitleIndex\",
                    \"KeySchema\": [
                        {\"AttributeName\":\"GameTitle\",\"KeyType\":\"HASH\"},
                        {\"AttributeName\":\"TopScore\",\"KeyType\":\"RANGE\"}
                    ],
                    \"Projection\": {
                        \"ProjectionType\":\"INCLUDE\",
                        \"NonKeyAttributes\":[\"UserId\"]
                    },
                    \"ProvisionedThroughput\": {
                        \"ReadCapacityUnits\": 10,
                        \"WriteCapacityUnits\": 5
                    }
                }
            ]"

Output::

    {
        "TableDescription": {
            "AttributeDefinitions": [
                {
                    "AttributeName": "GameTitle",
                    "AttributeType": "S"
                },
                {
                    "AttributeName": "TopScore",
                    "AttributeType": "N"
                },
                {
                    "AttributeName": "UserId",
                    "AttributeType": "S"
                }
            ],
            "TableName": "GameScores",
            "KeySchema": [
                {
                    "AttributeName": "UserId",
                    "KeyType": "HASH"
                },
                {
                    "AttributeName": "GameTitle",
                    "KeyType": "RANGE"
                }
            ],
            "TableStatus": "CREATING",
            "CreationDateTime": "2020-05-26T17:28:15.602000-07:00",
            "ProvisionedThroughput": {
                "NumberOfDecreasesToday": 0,
                "ReadCapacityUnits": 10,
                "WriteCapacityUnits": 5
            },
            "TableSizeBytes": 0,
            "ItemCount": 0,
            "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/GameScores",
            "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "GameTitleIndex",
                    "KeySchema": [
                        {
                            "AttributeName": "GameTitle",
                            "KeyType": "HASH"
                        },
                        {
                            "AttributeName": "TopScore",
                            "KeyType": "RANGE"
                        }
                    ],
                    "Projection": {
                        "ProjectionType": "INCLUDE",
                        "NonKeyAttributes": [
                            "UserId"
                        ]
                    },
                    "IndexStatus": "CREATING",
                    "ProvisionedThroughput": {
                        "NumberOfDecreasesToday": 0,
                        "ReadCapacityUnits": 10,
                        "WriteCapacityUnits": 5
                    },
                    "IndexSizeBytes": 0,
                    "ItemCount": 0,
                    "IndexArn": "arn:aws:dynamodb:us-west-2:123456789012:table/GameScores/index/GameTitleIndex"
                }
            ]
        }
    }

For more information, see `Basic Operations for Tables <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 6: To create a table with multiple Global Secondary Indexes at once**

The following example creates a table named ``GameScores`` with two Global Secondary Indexes. The GSI schemas are passed via a file, rather than on the command line. ::

    aws dynamodb create-table \
        --table-name GameScores \
        --attribute-definitions AttributeName=UserId,AttributeType=S AttributeName=GameTitle,AttributeType=S AttributeName=TopScore,AttributeType=N AttributeName=Date,AttributeType=S \
        --key-schema AttributeName=UserId,KeyType=HASH AttributeName=GameTitle,KeyType=RANGE \
        --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5 \
        --global-secondary-indexes file://gsi.json

Contents of ``gsi.json``::

    [
        {
            "IndexName": "GameTitleIndex",
            "KeySchema": [
                {
                    "AttributeName": "GameTitle",
                    "KeyType": "HASH"
                },
                {
                    "AttributeName": "TopScore",
                    "KeyType": "RANGE"
                }
            ],
            "Projection": {
                "ProjectionType": "ALL"
            },
            "ProvisionedThroughput": {
                "ReadCapacityUnits": 10,
                "WriteCapacityUnits": 5
            }
        },
        {
            "IndexName": "GameDateIndex",
            "KeySchema": [
                {
                    "AttributeName": "GameTitle",
                    "KeyType": "HASH"
                },
                {
                    "AttributeName": "Date",
                    "KeyType": "RANGE"
                }
            ],
            "Projection": {
                "ProjectionType": "ALL"
            },
            "ProvisionedThroughput": {
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5
            }
        }
    ]

Output::

    {
        "TableDescription": {
            "AttributeDefinitions": [
                {
                    "AttributeName": "Date",
                    "AttributeType": "S"
                },
                {
                    "AttributeName": "GameTitle",
                    "AttributeType": "S"
                },
                {
                    "AttributeName": "TopScore",
                    "AttributeType": "N"
                },
                {
                    "AttributeName": "UserId",
                    "AttributeType": "S"
                }
            ],
            "TableName": "GameScores",
            "KeySchema": [
                {
                    "AttributeName": "UserId",
                    "KeyType": "HASH"
                },
                {
                    "AttributeName": "GameTitle",
                    "KeyType": "RANGE"
                }
            ],
            "TableStatus": "CREATING",
            "CreationDateTime": "2020-08-04T16:40:55.524000-07:00",
            "ProvisionedThroughput": {
                "NumberOfDecreasesToday": 0,
                "ReadCapacityUnits": 10,
                "WriteCapacityUnits": 5
            },
            "TableSizeBytes": 0,
            "ItemCount": 0,
            "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/GameScores",
            "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "GameTitleIndex",
                    "KeySchema": [
                        {
                            "AttributeName": "GameTitle",
                            "KeyType": "HASH"
                        },
                        {
                            "AttributeName": "TopScore",
                            "KeyType": "RANGE"
                        }
                    ],
                    "Projection": {
                        "ProjectionType": "ALL"
                    },
                    "IndexStatus": "CREATING",
                    "ProvisionedThroughput": {
                        "NumberOfDecreasesToday": 0,
                        "ReadCapacityUnits": 10,
                        "WriteCapacityUnits": 5
                    },
                    "IndexSizeBytes": 0,
                    "ItemCount": 0,
                    "IndexArn": "arn:aws:dynamodb:us-west-2:123456789012:table/GameScores/index/GameTitleIndex"
                },
                {
                    "IndexName": "GameDateIndex",
                    "KeySchema": [
                        {
                            "AttributeName": "GameTitle",
                            "KeyType": "HASH"
                        },
                        {
                            "AttributeName": "Date",
                            "KeyType": "RANGE"
                        }
                    ],
                    "Projection": {
                        "ProjectionType": "ALL"
                    },
                    "IndexStatus": "CREATING",
                    "ProvisionedThroughput": {
                        "NumberOfDecreasesToday": 0,
                        "ReadCapacityUnits": 5,
                        "WriteCapacityUnits": 5
                    },
                    "IndexSizeBytes": 0,
                    "ItemCount": 0,
                    "IndexArn": "arn:aws:dynamodb:us-west-2:123456789012:table/GameScores/index/GameDateIndex"
                }
            ]
        }
    }

For more information, see `Basic Operations for Tables <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 7: To create a table with Streams enabled**

The following example creates a table called ``GameScores`` with DynamoDB Streams enabled. Both new and old images of each item will be written to the stream. ::

    aws dynamodb create-table \
        --table-name GameScores \
        --attribute-definitions AttributeName=UserId,AttributeType=S AttributeName=GameTitle,AttributeType=S \
        --key-schema AttributeName=UserId,KeyType=HASH AttributeName=GameTitle,KeyType=RANGE \
        --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5 \
        --stream-specification StreamEnabled=TRUE,StreamViewType=NEW_AND_OLD_IMAGES

Output::

    {
        "TableDescription": {
            "AttributeDefinitions": [
                {
                    "AttributeName": "GameTitle",
                    "AttributeType": "S"
                },
                {
                    "AttributeName": "UserId",
                    "AttributeType": "S"
                }
            ],
            "TableName": "GameScores",
            "KeySchema": [
                {
                    "AttributeName": "UserId",
                    "KeyType": "HASH"
                },
                {
                    "AttributeName": "GameTitle",
                    "KeyType": "RANGE"
                }
            ],
            "TableStatus": "CREATING",
            "CreationDateTime": "2020-05-27T10:49:34.056000-07:00",
            "ProvisionedThroughput": {
                "NumberOfDecreasesToday": 0,
                "ReadCapacityUnits": 10,
                "WriteCapacityUnits": 5
            },
            "TableSizeBytes": 0,
            "ItemCount": 0,
            "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/GameScores",
            "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "StreamSpecification": {
                "StreamEnabled": true,
                "StreamViewType": "NEW_AND_OLD_IMAGES"
            },
            "LatestStreamLabel": "2020-05-27T17:49:34.056",
            "LatestStreamArn": "arn:aws:dynamodb:us-west-2:123456789012:table/GameScores/stream/2020-05-27T17:49:34.056"
        }
    }

For more information, see `Basic Operations for Tables <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 8: To create a table with Keys-Only Stream enabled**

The following example creates a table called ``GameScores`` with DynamoDB Streams enabled. Only the key attributes of modified items are written to the stream. ::

    aws dynamodb create-table \
        --table-name GameScores \
        --attribute-definitions AttributeName=UserId,AttributeType=S AttributeName=GameTitle,AttributeType=S \
        --key-schema AttributeName=UserId,KeyType=HASH AttributeName=GameTitle,KeyType=RANGE \
        --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5 \
        --stream-specification StreamEnabled=TRUE,StreamViewType=KEYS_ONLY  

Output:: 

    {
        "TableDescription": {
            "AttributeDefinitions": [
                {
                    "AttributeName": "GameTitle",
                    "AttributeType": "S"
                },
                {
                    "AttributeName": "UserId",
                    "AttributeType": "S"
                }
            ],
            "TableName": "GameScores",
            "KeySchema": [
                {
                    "AttributeName": "UserId",
                    "KeyType": "HASH"
                },
                {
                    "AttributeName": "GameTitle",
                    "KeyType": "RANGE"
                }
            ],
            "TableStatus": "CREATING",
            "CreationDateTime": "2023-05-25T18:45:34.140000+00:00",
            "ProvisionedThroughput": {
                "NumberOfDecreasesToday": 0,
                "ReadCapacityUnits": 10,
                "WriteCapacityUnits": 5
            },
            "TableSizeBytes": 0,
            "ItemCount": 0,
            "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/GameScores",
            "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "StreamSpecification": {
                "StreamEnabled": true,
                "StreamViewType": "KEYS_ONLY"
            },
            "LatestStreamLabel": "2023-05-25T18:45:34.140",
            "LatestStreamArn": "arn:aws:dynamodb:us-west-2:123456789012:table/GameScores/stream/2023-05-25T18:45:34.140",
            "DeletionProtectionEnabled": false
        }
    }

For more information, see `Change data capture for DynamoDB Streams <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 9: To create a table with the Standard Infrequent Access class**

The following example creates a table called ``GameScores`` and assigns the Standard-Infrequent Access (DynamoDB Standard-IA) table class. This table class is optimized for storage being the dominant cost. ::
    
    aws dynamodb create-table \
        --table-name GameScores \
        --attribute-definitions AttributeName=UserId,AttributeType=S AttributeName=GameTitle,AttributeType=S \
        --key-schema AttributeName=UserId,KeyType=HASH AttributeName=GameTitle,KeyType=RANGE \
        --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5 \
        --table-class STANDARD_INFREQUENT_ACCESS

Output:: 

    {
        "TableDescription": {
            "AttributeDefinitions": [
                {
                    "AttributeName": "GameTitle",
                    "AttributeType": "S"
                },
                {
                    "AttributeName": "UserId",
                    "AttributeType": "S"
                }
            ],
            "TableName": "GameScores",
            "KeySchema": [
                {
                    "AttributeName": "UserId",
                    "KeyType": "HASH"
                },
                {
                    "AttributeName": "GameTitle",
                    "KeyType": "RANGE"
                }
            ],
            "TableStatus": "CREATING",
            "CreationDateTime": "2023-05-25T18:33:07.581000+00:00",
            "ProvisionedThroughput": {
                "NumberOfDecreasesToday": 0,
                "ReadCapacityUnits": 10,
                "WriteCapacityUnits": 5
            },
            "TableSizeBytes": 0,
            "ItemCount": 0,
            "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/GameScores",
            "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "TableClassSummary": {
                "TableClass": "STANDARD_INFREQUENT_ACCESS"
            },
            "DeletionProtectionEnabled": false
        }
    }


For more information, see `Table classes <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.TableClasses.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 10: To Create a table with Delete Protection enabled**

The following example creates a table called ``GameScores`` and enables deletion protection. ::

    aws dynamodb create-table \
        --table-name GameScores \
        --attribute-definitions AttributeName=UserId,AttributeType=S AttributeName=GameTitle,AttributeType=S \
        --key-schema AttributeName=UserId,KeyType=HASH AttributeName=GameTitle,KeyType=RANGE \
        --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5 \
        --deletion-protection-enabled 

Output::

    {
        "TableDescription": {
            "AttributeDefinitions": [
                {
                    "AttributeName": "GameTitle",
                    "AttributeType": "S"
                },
                {
                    "AttributeName": "UserId",
                    "AttributeType": "S"
                }
            ],
            "TableName": "GameScores",
            "KeySchema": [
                {
                    "AttributeName": "UserId",
                    "KeyType": "HASH"
                },
                {
                    "AttributeName": "GameTitle",
                    "KeyType": "RANGE"
                }
            ],
            "TableStatus": "CREATING",
            "CreationDateTime": "2023-05-25T23:02:17.093000+00:00",
            "ProvisionedThroughput": {
                "NumberOfDecreasesToday": 0,
                "ReadCapacityUnits": 10,
                "WriteCapacityUnits": 5
            },
            "TableSizeBytes": 0,
            "ItemCount": 0,
            "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/GameScores",
            "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "DeletionProtectionEnabled": true
        }
    }

For more information, see `Using deletion protection <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html#WorkingWithTables.Basics.DeletionProtection>`__ in the *Amazon DynamoDB Developer Guide*.
