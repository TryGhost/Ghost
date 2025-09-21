**To create a backup for an existing DynamoDB table**

The following ``create-backup`` example creates a backup of the ``MusicCollection`` table. ::

    aws dynamodb create-backup \
        --table-name MusicCollection \
        --backup-name MusicCollectionBackup

Output::

    {
        "BackupDetails": {
            "BackupArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/backup/01576616366715-b4e58d3a",
            "BackupName": "MusicCollectionBackup",
            "BackupSizeBytes": 0,
            "BackupStatus": "CREATING",
            "BackupType": "USER",
            "BackupCreationDateTime": 1576616366.715
        }
    }

For more information, see `On-Demand Backup and Restore for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BackupRestore.html>`__ in the *Amazon DynamoDB Developer Guide*.
