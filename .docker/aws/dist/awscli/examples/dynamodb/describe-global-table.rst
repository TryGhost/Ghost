**To display information about a DynamoDB global table**

The following ``describe-global-table`` example displays details about the ``MusicCollection`` global table. ::

    aws dynamodb describe-global-table \
        --global-table-name MusicCollection

Output::

    {
        "GlobalTableDescription": {
            "ReplicationGroup": [
                {
                    "RegionName": "us-east-2"
                },
                {
                    "RegionName": "us-east-1"
                }
            ],
            "GlobalTableArn": "arn:aws:dynamodb::123456789012:global-table/MusicCollection",
            "CreationDateTime": 1576625818.532,
            "GlobalTableStatus": "ACTIVE",
            "GlobalTableName": "MusicCollection"
        }
    }

For more information, see `DynamoDB Global Tables <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html>`__ in the *Amazon DynamoDB Developer Guide*.