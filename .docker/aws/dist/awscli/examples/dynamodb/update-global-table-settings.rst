**To update provisioned write capacity settings on a DynamoDB global table**

The following ``update-global-table-settings`` example sets the provisioned write capacity of the ``MusicCollection`` global table to 15. ::

    aws dynamodb update-global-table-settings \
        --global-table-name MusicCollection \
        --global-table-provisioned-write-capacity-units 15

Output::

    {
        "GlobalTableName": "MusicCollection",
        "ReplicaSettings": [
            {
                "RegionName": "eu-west-1",
                "ReplicaStatus": "UPDATING",
                "ReplicaProvisionedReadCapacityUnits": 10,
                "ReplicaProvisionedReadCapacityAutoScalingSettings": {
                    "AutoScalingDisabled": true
                },
                "ReplicaProvisionedWriteCapacityUnits": 10,
                "ReplicaProvisionedWriteCapacityAutoScalingSettings": {
                    "AutoScalingDisabled": true
                }
            },
            {
                "RegionName": "us-east-1",
                "ReplicaStatus": "UPDATING",
                "ReplicaProvisionedReadCapacityUnits": 10,
                "ReplicaProvisionedReadCapacityAutoScalingSettings": {
                    "AutoScalingDisabled": true
                },
                "ReplicaProvisionedWriteCapacityUnits": 10,
                "ReplicaProvisionedWriteCapacityAutoScalingSettings": {
                    "AutoScalingDisabled": true
                }
            },
            {
                "RegionName": "us-east-2",
                "ReplicaStatus": "UPDATING",
                "ReplicaProvisionedReadCapacityUnits": 10,
                "ReplicaProvisionedReadCapacityAutoScalingSettings": {
                    "AutoScalingDisabled": true
                },
                "ReplicaProvisionedWriteCapacityUnits": 10,
                "ReplicaProvisionedWriteCapacityAutoScalingSettings": {
                    "AutoScalingDisabled": true
                }
            }
        ]
    }

For more information, see `DynamoDB Global Tables <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html>`__ in the *Amazon DynamoDB Developer Guide*.
