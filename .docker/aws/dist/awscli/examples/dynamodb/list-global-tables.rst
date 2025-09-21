**To list existing DynamoDB global tables**

The following ``list-global-tables`` example lists all of your existing global tables. ::

    aws dynamodb list-global-tables

Output::

    {
        "GlobalTables": [
            {
                "GlobalTableName": "MusicCollection",
                "ReplicationGroup": [
                    {
                        "RegionName": "us-east-2"
                    },
                    {
                        "RegionName": "us-east-1"
                    }
                ]
            }
        ]
    }

For more information, see `DynamoDB Global Tables <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html>`__ in the *Amazon DynamoDB Developer Guide*.
