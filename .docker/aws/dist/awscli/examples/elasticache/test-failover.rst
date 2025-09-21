**To test failover of a node group**

The following ``test-failover`` example tests automatic failover on the specified node group (called a shard in the console) in a replication group (called a cluster in the console). ::

    aws elasticache test-failover /
        --replication-group-id "mycluster" /
        --node-group-id "0001"

Output::

    {
        "ReplicationGroup": {
            "ReplicationGroupId": "mycluster",
            "Description": "My Cluster",
            "Status": "available",
            "PendingModifiedValues": {},
            "MemberClusters": [
                "mycluster-0001-001",
                "mycluster-0001-002",
                "mycluster-0001-003",
                "mycluster-0002-001",
                "mycluster-0002-002",
                "mycluster-0002-003",
                "mycluster-0003-001",
                "mycluster-0003-002",
                "mycluster-0003-003"
            ],
            "NodeGroups": [
                {
                    "NodeGroupId": "0001",
                    "Status": "available",
                    "Slots": "0-5461",
                    "NodeGroupMembers": [
                        {
                            "CacheClusterId": "mycluster-0001-001",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2b"
                        },
                        {
                            "CacheClusterId": "mycluster-0001-002",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2a"
                        },
                        {
                            "CacheClusterId": "mycluster-0001-003",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2c"
                        }
                    ]
                },
                {
                    "NodeGroupId": "0002",
                    "Status": "available",
                    "Slots": "5462-10922",
                    "NodeGroupMembers": [
                        {
                            "CacheClusterId": "mycluster-0002-001",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2a"
                        },
                        {
                            "CacheClusterId": "mycluster-0002-002",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2b"
                        },
                        {
                            "CacheClusterId": "mycluster-0002-003",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2c"
                        }
                    ]
                },
                {
                    "NodeGroupId": "0003",
                    "Status": "available",
                    "Slots": "10923-16383",
                    "NodeGroupMembers": [
                        {
                            "CacheClusterId": "mycluster-0003-001",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2c"
                        },
                        {
                            "CacheClusterId": "mycluster-0003-002",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2b"
                        },
                        {
                            "CacheClusterId": "mycluster-0003-003",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2a"
                        }
                    ]
                }
            ],
            "AutomaticFailover": "enabled",
            "ConfigurationEndpoint": {
                "Address": "mycluster.xxxxih.clustercfg.usw2.cache.amazonaws.com",
                "Port": 6379
            },
            "SnapshotRetentionLimit": 1,
            "SnapshotWindow": "13:00-14:00",
            "ClusterEnabled": true,
            "CacheNodeType": "cache.r5.large",
            "TransitEncryptionEnabled": false,
            "AtRestEncryptionEnabled": false
        }
    }
