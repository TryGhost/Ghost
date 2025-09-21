**To start a migration**

The following ``start-migration`` migrates your data from self-hosted Redis on Amazon EC2 to Amazon ElastiCache, using the Redis engine. ::

    aws elasticache start-migration \
       --replication-group-id test \
       --customer-node-endpoint-list "Address='test.g2xbih.ng.0001.usw2.cache.amazonaws.com',Port=6379"
        
Output ::

    {
        "ReplicationGroup": {
            "ReplicationGroupId": "test",
            "Description": "test",
            "GlobalReplicationGroupInfo": {},
            "Status": "modifying",
            "PendingModifiedValues": {},
            "MemberClusters": [
                "test-001",
                "test-002",
                "test-003"
            ],
            "NodeGroups": [
                {
                    "NodeGroupId": "0001",
                    "Status": "available",
                    "PrimaryEndpoint": {
                        "Address": "test.g2xbih.ng.0001.usw2.cache.amazonaws.com",
                        "Port": 6379
                    },
                    "ReaderEndpoint": {
                        "Address": "test-ro.g2xbih.ng.0001.usw2.cache.amazonaws.com",
                        "Port": 6379
                    },
                    "NodeGroupMembers": [
                        {
                            "CacheClusterId": "test-001",
                            "CacheNodeId": "0001",
                            "ReadEndpoint": {
                                "Address": "test-001.g2xbih.0001.usw2.cache.amazonaws.com",
                                "Port": 6379
                            },
                            "PreferredAvailabilityZone": "us-west-2a",
                            "CurrentRole": "primary"
                        },
                        {
                            "CacheClusterId": "test-002",
                            "CacheNodeId": "0001",
                            "ReadEndpoint": {
                                "Address": "test-002.g2xbih.0001.usw2.cache.amazonaws.com",
                                "Port": 6379
                            },
                            "PreferredAvailabilityZone": "us-west-2c",
                            "CurrentRole": "replica"
                        },
                        {
                            "CacheClusterId": "test-003",
                            "CacheNodeId": "0001",
                            "ReadEndpoint": {
                                "Address": "test-003.g2xbih.0001.usw2.cache.amazonaws.com",
                                "Port": 6379
                            },
                            "PreferredAvailabilityZone": "us-west-2b",
                            "CurrentRole": "replica"
                        }
                    ]
                }
            ],
            "SnapshottingClusterId": "test-002",
            "AutomaticFailover": "enabled",
            "MultiAZ": "enabled",
            "SnapshotRetentionLimit": 1,
            "SnapshotWindow": "07:30-08:30",
            "ClusterEnabled": false,
            "CacheNodeType": "cache.r5.large",
            "TransitEncryptionEnabled": false,
            "AtRestEncryptionEnabled": false
        }
    }

For more information, see `Online Migration to ElastiCache <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/OnlineMigration.html>`__ in the *Elasticache User Guide*.