**To delete a snapshot**

The following ``delete-snapshot`` example deletes a snapshot. ::

    aws memorydb delete-snapshot \
        --snapshot-name my-cluster-snapshot

Output::

    {
        "Snapshot": {
            "Name": "my-cluster-snapshot",
            "Status": "deleting",
            "Source": "manual",
            "ARN": "arn:aws:memorydb:us-east-1:49165xxxxxx:snapshot/my-cluster-snapshot",
            "ClusterConfiguration": {
                "Name": "my-cluster",
                "Description": "",
                "NodeType": "db.r6g.large",
                "EngineVersion": "6.2",
                "MaintenanceWindow": "wed:03:00-wed:04:00",
                "Port": 6379,
                "ParameterGroupName": "default.memorydb-redis6",
                "SubnetGroupName": "my-sg",
                "VpcId": "vpc-862xxxxc",
                "SnapshotRetentionLimit": 0,
                "SnapshotWindow": "04:30-05:30",
                "NumShards": 2
            }
        }
    }

For more information, see `Deleting a snapshot <https://docs.aws.amazon.com/memorydb/latest/devguide/snapshots-deleting.html>`__ in the *MemoryDB User Guide*.
