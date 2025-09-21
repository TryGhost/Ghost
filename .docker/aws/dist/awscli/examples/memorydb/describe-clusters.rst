**To return a list of clusters**

The following `describe-clusters`` returns a list of clusters. ::

    aws memorydb describe-clusters

Output::

    {
        "Clusters": [
            {
                    "Name": "my-cluster",
                    "Status": "available",
                    "NumberOfShards": 2,
                    "ClusterEndpoint": {
                        "Address": "clustercfg.my-cluster.llru6f.memorydb.us-east-1.amazonaws.com",
                        "Port": 6379
                    },
                    "NodeType": "db.r6g.large",
                    "EngineVersion": "6.2",
                    "EnginePatchVersion": "6.2.6",
                    "ParameterGroupName": "default.memorydb-redis6",
                    "ParameterGroupStatus": "in-sync",
                    "SecurityGroups": [
                        {
                            "SecurityGroupId": "sg-0a1434xxxxxc9fae",
                            "Status": "active"
                        }
                    ],
                    "SubnetGroupName": "pat-sg",
                    "TLSEnabled": true,
                    "ARN": "arn:aws:memorydb:us-east-1:49165xxxxxx:cluster/my-cluster",
                    "SnapshotRetentionLimit": 0,
                    "MaintenanceWindow": "wed:03:00-wed:04:00",
                    "SnapshotWindow": "04:30-05:30",
                    "ACLName": "my-acl",
                    "AutoMinorVersionUpgrade": true
            }
        ]
    }

For more information, see `Managing clusters <https://docs.aws.amazon.com/memorydb/latest/devguide/clusters.html>`__ in the *MemoryDB User Guide*.
