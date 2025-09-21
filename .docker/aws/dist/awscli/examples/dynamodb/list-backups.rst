**Example 1: To list all existing DynamoDB backups**

The following ``list-backups`` example lists all of your existing backups. ::

    aws dynamodb list-backups

Output::

    {
        "BackupSummaries": [
            {
                "TableName": "MusicCollection",
                "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection",
                "BackupArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/backup/01234567890123-a1bcd234",
                "BackupName": "MusicCollectionBackup1",
                "BackupCreationDateTime": "2020-02-12T14:41:51.617000-08:00",
                "BackupStatus": "AVAILABLE",
                "BackupType": "USER",
                "BackupSizeBytes": 170
            },
            {
                "TableName": "MusicCollection",
                "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection",
                "BackupArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/backup/01234567890123-b2abc345",
                "BackupName": "MusicCollectionBackup2",
                "BackupCreationDateTime": "2020-06-26T11:08:35.431000-07:00",
                "BackupStatus": "AVAILABLE",
                "BackupType": "USER",
                "BackupSizeBytes": 400
            }
        ]
    }

For more information, see `On-Demand Backup and Restore for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BackupRestore.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 2: To list user-created backups in a specific time range**

The following example lists only backups of the ``MusicCollection`` table that were created by the user (not those automatically created by DynamoDB) with a creation date between January 1, 2020 and March 1, 2020. ::

    aws dynamodb list-backups \
        --table-name MusicCollection \
        --time-range-lower-bound 1577836800 \
        --time-range-upper-bound 1583020800 \
        --backup-type USER

Output::

    {
        "BackupSummaries": [
            {
                "TableName": "MusicCollection",
                "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection",
                "BackupArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/backup/01234567890123-a1bcd234",
                "BackupName": "MusicCollectionBackup1",
                "BackupCreationDateTime": "2020-02-12T14:41:51.617000-08:00",
                "BackupStatus": "AVAILABLE",
                "BackupType": "USER",
                "BackupSizeBytes": 170
            }
        ]
    }

For more information, see `On-Demand Backup and Restore for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BackupRestore.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 3: To limit page size**

The following example returns a list of all existing backups, but retrieves only one item in each call, performing multiple calls if necessary to get the entire list. Limiting the page size is useful when running list commands on a large number of resources, which can result in a "timed out" error when using the default page size of 1000. ::

    aws dynamodb list-backups \
        --page-size 1

Output::

    {
        "BackupSummaries": [
            {
                "TableName": "MusicCollection",
                "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection",
                "BackupArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/backup/01234567890123-a1bcd234",
                "BackupName": "MusicCollectionBackup1",
                "BackupCreationDateTime": "2020-02-12T14:41:51.617000-08:00",
                "BackupStatus": "AVAILABLE",
                "BackupType": "USER",
                "BackupSizeBytes": 170
            },
            {
                "TableName": "MusicCollection",
                "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection",
                "BackupArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/backup/01234567890123-b2abc345",
                "BackupName": "MusicCollectionBackup2",
                "BackupCreationDateTime": "2020-06-26T11:08:35.431000-07:00",
                "BackupStatus": "AVAILABLE",
                "BackupType": "USER",
                "BackupSizeBytes": 400
            }
        ]
    }

For more information, see `On-Demand Backup and Restore for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BackupRestore.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 4: To limit the number of items returned**

The following example limits the number of items returned to 1. The response includes a ``NextToken`` value with which to retrieve the next page of results. ::

    aws dynamodb list-backups \
        --max-items 1

Output::

    {
        "BackupSummaries": [
            {
                "TableName": "MusicCollection",
                "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection",
                "BackupArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/backup/01234567890123-a1bcd234",
                "BackupName": "MusicCollectionBackup1",
                "BackupCreationDateTime": "2020-02-12T14:41:51.617000-08:00",
                "BackupStatus": "AVAILABLE",
                "BackupType": "USER",
                "BackupSizeBytes": 170
            }
        ],
        "NextToken": "abCDeFGhiJKlmnOPqrSTuvwxYZ1aBCdEFghijK7LM51nOpqRSTuv3WxY3ZabC5dEFGhI2Jk3LmnoPQ6RST9"
    }

For more information, see `On-Demand Backup and Restore for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BackupRestore.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 5: To retrieve the next page of results**

The following command uses the ``NextToken`` value from a previous call to the ``list-backups`` command to retrieve another page of results. Since the response in this case does not include a ``NextToken`` value, we know that we have reached the end of the results. ::

    aws dynamodb list-backups \
        --starting-token abCDeFGhiJKlmnOPqrSTuvwxYZ1aBCdEFghijK7LM51nOpqRSTuv3WxY3ZabC5dEFGhI2Jk3LmnoPQ6RST9

Output ::

    {
        "BackupSummaries": [
            {
                "TableName": "MusicCollection",
                "TableId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "TableArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection",
                "BackupArn": "arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection/backup/01234567890123-b2abc345",
                "BackupName": "MusicCollectionBackup2",
                "BackupCreationDateTime": "2020-06-26T11:08:35.431000-07:00",
                "BackupStatus": "AVAILABLE",
                "BackupType": "USER",
                "BackupSizeBytes": 400
            }
        ]
    }

For more information, see `On-Demand Backup and Restore for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BackupRestore.html>`__ in the *Amazon DynamoDB Developer Guide*.