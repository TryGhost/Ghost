**To create a cluster**

The following ``create-cluster`` example creates a new cluster. ::

    aws memorydb create-cluster \
        --cluster-name my-new-cluster \
        --node-type db.r6g.large \
        --acl-name my-acl \
        --subnet-group my-sg

Output::

    {
        "Cluster": {
            "Name": "my-new-cluster",
            "Status": "creating",
            "NumberOfShards": 1,
            "AvailabilityMode": "MultiAZ",
            "ClusterEndpoint": {
                "Port": 6379
            },
            "NodeType": "db.r6g.large",
            "EngineVersion": "6.2",
            "EnginePatchVersion": "6.2.6",
            "ParameterGroupName": "default.memorydb-redis6",
            "ParameterGroupStatus": "in-sync",
            "SubnetGroupName": "my-sg",
            "TLSEnabled": true,
            "ARN": "arn:aws:memorydb:us-east-1:49165xxxxxx:cluster/my-new-cluster",
            "SnapshotRetentionLimit": 0,
            "MaintenanceWindow": "sat:10:00-sat:11:00",
            "SnapshotWindow": "07:30-08:30",
            "ACLName": "my-acl",
            "AutoMinorVersionUpgrade": true
        }
    }

For more information, see `Managing Clusters <https://docs.aws.amazon.com/memorydb/latest/devguide/clusters.html>`__ in the *MemoryDB User Guide*.
