**To restore a DynamoDB table from an existing backup**

The following ``restore-table-from-backup`` example restores the specified table from an existing backup. ::

    aws dynamodb restore-table-from-backup \
        --target-table-name MusicCollection \
        --backup-arnarn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/backup/01576616366715-b4e58d3a

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
            "TableName": "MusicCollection2",
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
            "CreationDateTime": 1576618274.326,
            "ProvisionedThroughput": {
                "NumberOfDecreasesToday": 0,
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5
            },
            "TableSizeBytes": 0,
            "ItemCount": 0,
            "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection2",
            "TableId": "114865c9-5ef3-496c-b4d1-c4cbdd2d44fb",
            "BillingModeSummary": {
                "BillingMode": "PROVISIONED"
            },
            "RestoreSummary": {
                "SourceBackupArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/backup/01576616366715-b4e58d3a",
                "SourceTableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection",
                "RestoreDateTime": 1576616366.715,
                "RestoreInProgress": true
            }
        }
    }

For more information, see `On-Demand Backup and Restore for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BackupRestore.html>`__ in the *Amazon DynamoDB Developer Guide*.
