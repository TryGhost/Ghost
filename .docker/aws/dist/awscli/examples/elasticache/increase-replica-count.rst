**To increase replica count**

The following ``increase-replica-count`` example does one of two things. It can dynamically increase the number of replicas in a Redis (cluster mode disabled) replication group. Or it can dynamically increase the number of replica nodes in one or more node groups (shards) of a Redis (cluster mode enabled) replication group. This operation is performed with no cluster downtime. ::

    aws elasticache increase-replica-count \
        --replication-group-id "my-cluster" \
        --apply-immediately \
        --new-replica-count 3

Output::

   {
        "ReplicationGroup": {
            "ReplicationGroupId": "my-cluster",
            "Description": " ",
            "Status": "modifying",
            "PendingModifiedValues": {},
            "MemberClusters": [
                "my-cluster-001",
                "my-cluster-002",
                "my-cluster-003",
                "my-cluster-004"
            ],
            "NodeGroups": [
                {
                    "NodeGroupId": "0001",
                    "Status": "modifying",
                    "PrimaryEndpoint": {
                        "Address": "my-cluster.xxxxxih.ng.0001.usw2.cache.amazonaws.com",
                        "Port": 6379
                    },
                    "ReaderEndpoint": {
                        "Address": "my-cluster-ro.xxxxxxih.ng.0001.usw2.cache.amazonaws.com",
                        "Port": 6379
                    },
                    "NodeGroupMembers": [
                        {
                            "CacheClusterId": "my-cluster-001",
                            "CacheNodeId": "0001",
                            "ReadEndpoint": {
                                "Address": "my-cluster-001.xxxxxih.0001.usw2.cache.amazonaws.com",
                                "Port": 6379
                            },
                            "PreferredAvailabilityZone": "us-west-2a",
                            "CurrentRole": "primary"
                        },
                        {
                            "CacheClusterId": "my-cluster-003",
                            "CacheNodeId": "0001",
                            "ReadEndpoint": {
                                "Address": "my-cluster-003.xxxxxih.0001.usw2.cache.amazonaws.com",
                                "Port": 6379
                            },
                            "PreferredAvailabilityZone": "us-west-2a",
                            "CurrentRole": "replica"
                        }
                    ]
                }
            ],
            "AutomaticFailover": "disabled",
            "SnapshotRetentionLimit": 0,
            "SnapshotWindow": "07:30-08:30",
            "ClusterEnabled": false,
            "CacheNodeType": "cache.r5.xlarge",
            "TransitEncryptionEnabled": false,
            "AtRestEncryptionEnabled": false
        }
    }

For more information, see `Increasing the Number of Replicas in a Shard <https://docs.aws.amazon.c`m/AmazonElastiCache/latest/red-ug/increase-replica-count.html>`__ in the *Elasticache User Guide*.
