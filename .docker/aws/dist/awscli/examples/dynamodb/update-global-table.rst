**To update a DynamoDB global table**

The following ``update-global-table`` example adds a replica in the specified Region to the ``MusicCollection`` global table. ::

    aws dynamodb update-global-table \
        --global-table-name MusicCollection \
        --replica-updates Create={RegionName=eu-west-1}

Output::

    {
        "GlobalTableDescription": {
            "ReplicationGroup": [
                {
                    "RegionName": "eu-west-1"
                },
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
