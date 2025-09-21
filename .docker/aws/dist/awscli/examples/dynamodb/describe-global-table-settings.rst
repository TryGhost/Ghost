**To get information about a DynamoDB global table's settings**

The following ``describe-global-table-settings`` example displays the settings for the ``MusicCollection`` global table. ::

    aws dynamodb describe-global-table-settings \
        --global-table-name MusicCollection

Output::

    {
        "GlobalTableName": "MusicCollection",
        "ReplicaSettings": [
            {
                "RegionName": "us-east-1",
                "ReplicaStatus": "ACTIVE",
                "ReplicaProvisionedReadCapacityUnits": 10,
                "ReplicaProvisionedReadCapacityAutoScalingSettings": {
                    "AutoScalingDisabled": true
                },
                "ReplicaProvisionedWriteCapacityUnits": 5,
                "ReplicaProvisionedWriteCapacityAutoScalingSettings": {
                    "AutoScalingDisabled": true
                }
            },
            {
                "RegionName": "us-east-2",
                "ReplicaStatus": "ACTIVE",
                "ReplicaProvisionedReadCapacityUnits": 10,
                "ReplicaProvisionedReadCapacityAutoScalingSettings": {
                    "AutoScalingDisabled": true
                },
                "ReplicaProvisionedWriteCapacityUnits": 5,
                "ReplicaProvisionedWriteCapacityAutoScalingSettings": {
                    "AutoScalingDisabled": true
                }
            }
        ]
    }

For more information, see `DynamoDB Global Tables <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html>`__ in the *Amazon DynamoDB Developer Guide*.
