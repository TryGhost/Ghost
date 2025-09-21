**To delete a cluster**

The following ``delete-cluster`` example deletes a cluster. ::

    aws memorydb delete-cluster \
        --cluster-name my-new-cluster

Output::

    {
        "Cluster": {
            "Name": "my-new-cluster",
            "Status": "deleting",
            "NumberOfShards": 1,
            "ClusterEndpoint": {
                "Address": "clustercfg.my-new-cluster.xxxxx.memorydb.us-east-1.amazonaws.com",
                "Port": 6379
            },
            "NodeType": "db.r6g.large",
            "EngineVersion": "6.2",
            "EnginePatchVersion": "6.2.6",
            "ParameterGroupName": "default.memorydb-redis6",
            "ParameterGroupStatus": "in-sync",
            "SubnetGroupName": "my-sg",
            "TLSEnabled": true,
            "ARN": "arn:aws:memorydb:us-east-1:491658xxxxxx:cluster/my-new-cluster",
            "SnapshotRetentionLimit": 0,
            "MaintenanceWindow": "sat:10:00-sat:11:00",
            "SnapshotWindow": "07:30-08:30",
            "AutoMinorVersionUpgrade": true
        }
    }

For more information, see `Deleting a cluster <https://docs.aws.amazon.com/memorydb/latest/devguide/clusters.delete.html>`__ in the *MemoryDB User Guide*.
