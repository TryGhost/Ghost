**To create a global table**

The following ``create-global-table`` example creates a global table from two identical tables in the specified, separate AWS Regions. ::

    aws dynamodb create-global-table \
        --global-table-name MusicCollection \
        --replication-group RegionName=us-east-2 RegionName=us-east-1 \
        --region us-east-2

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
            "GlobalTableStatus": "CREATING",
            "GlobalTableName": "MusicCollection"
        }
    }

For more information, see `DynamoDB Global Tables <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html>`__ in the *Amazon DynamoDB Developer Guide*.
