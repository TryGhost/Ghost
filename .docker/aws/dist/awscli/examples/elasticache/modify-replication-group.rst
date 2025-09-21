**To modify a replication group**

The following ``modify-replication-group`` disables Multi-AZ using the Redis engine. ::

    aws elasticache modify-replication-group \
        --replication-group-id test-cluster \
        --no-multi-az-enabled \
        --apply-immediately

Output ::

    {
        "ReplicationGroup": {
            "ReplicationGroupId": "test-cluster",
            "Description": "test-cluster",
            "GlobalReplicationGroupInfo": {
                "GlobalReplicationGroupId": "sgaui-pat-group",
                "GlobalReplicationGroupMemberRole": "PRIMARY"
            },
            "Status": "available",
            "PendingModifiedValues": {},
            "MemberClusters": [
                "test-cluster-001",
                "test-cluster-002",
                "test-cluster-003"
            ],
            "NodeGroups": [
                {
                    "NodeGroupId": "0001",
                    "Status": "available",
                    "PrimaryEndpoint": {
                        "Address": "test-cluster.g2xbih.ng.0001.usw2.cache.amazonaws.com",
                        "Port": 6379
                    },
                    "ReaderEndpoint": {
                        "Address": "test-cluster-ro.g2xbih.ng.0001.usw2.cache.amazonaws.com",
                        "Port": 6379
                    },
                    "NodeGroupMembers": [
                        {
                            "CacheClusterId": "test-cluster-001",
                            "CacheNodeId": "0001",
                            "ReadEndpoint": {
                                "Address": "test-cluster-001.g2xbih.0001.usw2.cache.amazonaws.com",
                                "Port": 6379
                            },
                            "PreferredAvailabilityZone": "us-west-2c",
                            "CurrentRole": "primary"
                        },
                        {
                            "CacheClusterId": "test-cluster-002",
                            "CacheNodeId": "0001",
                            "ReadEndpoint": {
                                "Address": "test-cluster-002.g2xbih.0001.usw2.cache.amazonaws.com",
                                "Port": 6379
                            },
                            "PreferredAvailabilityZone": "us-west-2b",
                            "CurrentRole": "replica"
                        },
                        {
                            "CacheClusterId": "test-cluster-003",
                            "CacheNodeId": "0001",
                            "ReadEndpoint": {
                                "Address": "test-cluster-003.g2xbih.0001.usw2.cache.amazonaws.com",
                                "Port": 6379
                            },
                            "PreferredAvailabilityZone": "us-west-2a",
                            "CurrentRole": "replica"
                        }
                    ]
                }
            ],
            "SnapshottingClusterId": "test-cluster-002",
            "AutomaticFailover": "enabled",
            "MultiAZ": "disabled",
            "SnapshotRetentionLimit": 1,
            "SnapshotWindow": "08:00-09:00",
            "ClusterEnabled": false,
            "CacheNodeType": "cache.r5.large",
            "TransitEncryptionEnabled": false,
            "AtRestEncryptionEnabled": false
        }
    }

For more information, see `Modifying a Replication Group <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Replication.Modify.html>`__ in the *Elasticache User Guide*.