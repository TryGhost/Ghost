**To modify a replication group shard configuration**

The following ``modify-replication-group-shard-configuration`` decreases the node group count using the Redis engine. ::

    aws elasticache modify-replication-group-shard-configuration \
        --replication-group-id mycluster \
        --node-group-count 3 \
        --apply-immediately \
        --node-groups-to-remove 0002
        
Output ::

    {
        "ReplicationGroup": {
            "ReplicationGroupId": "mycluster",
            "Description": "mycluster",
            "GlobalReplicationGroupInfo": {},
            "Status": "modifying",
            "PendingModifiedValues": {},
            "MemberClusters": [
                "mycluster-0002-001",
                "mycluster-0002-002",
                "mycluster-0002-003",
                "mycluster-0003-001",
                "mycluster-0003-002",
                "mycluster-0003-003",
                "mycluster-0003-004",
                "mycluster-0004-001",
                "mycluster-0004-002",
                "mycluster-0004-003",
                "mycluster-0005-001",
                "mycluster-0005-002",
                "mycluster-0005-003"
            ],
            "NodeGroups": [
                {
                    "NodeGroupId": "0002",
                    "Status": "modifying",
                    "Slots": "894-1767,3134-4443,5149-5461,6827-7332,12570-13662",
                    "NodeGroupMembers": [
                        {
                            "CacheClusterId": "mycluster-0002-001",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2c"
                        },
                        {
                            "CacheClusterId": "mycluster-0002-002",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2a"
                        },
                        {
                            "CacheClusterId": "mycluster-0002-003",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2b"
                        }
                    ]
                },
                {
                    "NodeGroupId": "0003",
                    "Status": "modifying",
                    "Slots": "0-324,5462-5692,6784-6826,7698-8191,10923-11075,12441-12569,13663-16383",
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
                        },
                        {
                            "CacheClusterId": "mycluster-0003-004",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2c"
                        }
                    ]
                },
                {
                    "NodeGroupId": "0004",
                    "Status": "modifying",
                    "Slots": "325-336,4706-5148,7333-7697,9012-10922,11076-12440",
                    "NodeGroupMembers": [
                        {
                            "CacheClusterId": "mycluster-0004-001",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2b"
                        },
                        {
                            "CacheClusterId": "mycluster-0004-002",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2a"
                        },
                        {
                            "CacheClusterId": "mycluster-0004-003",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2c"
                        }
                    ]
                },
                {
                    "NodeGroupId": "0005",
                    "Status": "modifying",
                    "Slots": "337-893,1768-3133,4444-4705,5693-6783,8192-9011",
                    "NodeGroupMembers": [
                        {
                            "CacheClusterId": "mycluster-0005-001",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2a"
                        },
                        {
                            "CacheClusterId": "mycluster-0005-002",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2c"
                        },
                        {
                            "CacheClusterId": "mycluster-0005-003",
                            "CacheNodeId": "0001",
                            "PreferredAvailabilityZone": "us-west-2b"
                        }
                    ]
                }
            ],
            "AutomaticFailover": "enabled",
            "MultiAZ": "enabled",
            "ConfigurationEndpoint": {
                "Address": "mycluster.g2xbih.clustercfg.usw2.cache.amazonaws.com",
                "Port": 6379
            },
            "SnapshotRetentionLimit": 1,
            "SnapshotWindow": "13:00-14:00",
            "ClusterEnabled": true,
            "CacheNodeType": "cache.r5.xlarge",
            "TransitEncryptionEnabled": false,
            "AtRestEncryptionEnabled": false
        }
    }

For more information, see `Scaling ElastiCache for Redis Clusters <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Scaling.html>`__ in the *Elasticache User Guide*.