**To return a list of allowed node type updates**

The following `list-allowed-node-type-updates` returns a list of available node type updates. ::

    aws memorydb list-allowed-node-type-updates

Output::

    {
        "Cluster": {
            "Name": "my-cluster",
            "Status": "available",
            "NumberOfShards": 2,
            "ClusterEndpoint": {
                "Address": "clustercfg.my-cluster.xxxxxx.memorydb.us-east-1.amazonaws.com",
                "Port": 6379
            },
            "NodeType": "db.r6g.large",
            "EngineVersion": "6.2",
            "EnginePatchVersion": "6.2.6",
            "ParameterGroupName": "default.memorydb-redis6",
            "ParameterGroupStatus": "in-sync",
            "SecurityGroups": [
                {
                    "SecurityGroupId": "sg-0a143xxxx45c9fae",
                    "Status": "active"
                }
            ],
            "SubnetGroupName": "my-sg",
            "TLSEnabled": true,
            "ARN": "arn:aws:memorydb:us-east-1:491658xxxxxx:cluster/my-cluster",
            "SnapshotRetentionLimit": 0,
            "MaintenanceWindow": "wed:03:00-wed:04:00",
            "SnapshotWindow": "04:30-05:30",
            "AutoMinorVersionUpgrade": true
        }
    }

For more information, see `Scaling <https://docs.aws.amazon.com/memorydb/latest/devguide/scaling.html>`__ in the *MemoryDB User Guide*.
