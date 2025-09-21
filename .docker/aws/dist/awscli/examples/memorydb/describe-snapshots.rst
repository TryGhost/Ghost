**To return a list of snapshots**

The following `describe-snapshots`` returns a list of snapshots. ::

    aws memorydb describe-snapshots

Output::

    {
    "Snapshots": [
        {
            "Name": "my-cluster-snapshot",
            "Status": "available",
            "Source": "manual",
            "ARN": "arn:aws:memorydb:us-east-1:491658xxxxxx2:snapshot/my-cluster-snapshot",
            "ClusterConfiguration": {
                "Name": "my-cluster",
                "Description": " ",
                "NodeType": "db.r6g.large",
                "EngineVersion": "6.2",
                "MaintenanceWindow": "wed:03:00-wed:04:00",
                "Port": 6379,
                "ParameterGroupName": "default.memorydb-redis6",
                "SubnetGroupName": "my-sg",
                "VpcId": "vpc-862574fc",
                "SnapshotRetentionLimit": 0,
                "SnapshotWindow": "04:30-05:30",
                "NumShards": 2
            }
        }
    }

For more information, see `Snapshot and restore <https://docs.aws.amazon.com/memorydb/latest/devguide/snapshots.html>`__ in the *MemoryDB User Guide*.
