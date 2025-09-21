**To copy a snapshot**

The following ``copy-snapshot`` example creates a copy of a snapshot. ::

    aws memorydb copy-snapshot \
        --source-snapshot-name my-cluster-snapshot \
        --target-snapshot-name my-cluster-snapshot-copy

Output ::

    {
        "Snapshot": {
            "Name": "my-cluster-snapshot-copy",
            "Status": "creating",
            "Source": "manual",
            "ARN": "arn:aws:memorydb:us-east-1:491658xxxxxx:snapshot/my-cluster-snapshot-copy",
            "ClusterConfiguration": {
                "Name": "my-cluster",
                "Description": " ",
                "NodeType": "db.r6g.large",
                "EngineVersion": "6.2",
                "MaintenanceWindow": "wed:03:00-wed:04:00",
                "Port": 6379,
                "ParameterGroupName": "default.memorydb-redis6",
                "SubnetGroupName": "my-sg",
                "VpcId": "vpc-xx2574fc",
                "SnapshotRetentionLimit": 0,
                "SnapshotWindow": "04:30-05:30",
                "NumShards": 2
            }
        }
    }

For more information, see `Copying a snapshot <https://docs.aws.amazon.com/memorydb/latest/devguide/snapshots-copying.html>`__ in the *MemoryDB User Guide*.
