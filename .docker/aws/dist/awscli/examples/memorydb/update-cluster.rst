**To update a cluster**

The following update-cluster`` updates the parameter group of a cluster to my-parameter-group. ::

    aws memorydb update-cluster \
        --cluster-name my-cluster \
        --parameter-group-name my-parameter-group

Output::

    {
        "Cluster": {
            "Name": "my-cluster",
            "Status": "available",
            "NumberOfShards": 2,
            "AvailabilityMode": "MultiAZ",
            "ClusterEndpoint": {
                "Address": "clustercfg.my-cluster.llru6f.memorydb.us-east-1.amazonaws.com",
                "Port": 6379
            },
            "NodeType": "db.r6g.large",
            "EngineVersion": "6.2",
            "EnginePatchVersion": "6.2.6",
            "ParameterGroupName": "my-parameter-group",
            "ParameterGroupStatus": "in-sync",
            "SecurityGroups": [
                {
                    "SecurityGroupId": "sg-0a143xxxxxc9fae",
                    "Status": "active"
                }
            ],
            "SubnetGroupName": "pat-sg",
            "TLSEnabled": true,
            "ARN": "arn:aws:memorydb:us-east-1:491658xxxxxx:cluster/my-cluster",
            "SnapshotRetentionLimit": 0,
            "MaintenanceWindow": "wed:03:00-wed:04:00",
            "SnapshotWindow": "04:30-05:30",
            "ACLName": "my-acl",
            "AutoMinorVersionUpgrade": true
        }
    }

For more information, see `Modifying a cluster <https://docs.aws.amazon.com/memorydb/latest/devguide/clusters.modify.html>`__ in the *MemoryDB User Guide*.
