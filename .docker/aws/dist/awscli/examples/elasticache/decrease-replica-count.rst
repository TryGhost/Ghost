**To decrease replica count**

The following ``decrease-replica-count`` example dynamically decreases the number of replicas in a Redis (cluster mode disabled) replication group or the number of replica nodes in one or more node groups (shards) of a Redis (cluster mode enabled) replication group. This operation is performed with no cluster downtime. ::

    aws elasticache decrease-replica-count \
        --replication-group-id my-cluster \
        --apply-immediately  \
        --new-replica-count 2

Output::

    {
        "ReplicationGroup": {
            "ReplicationGroupId": "my-cluster",
            "Description": " ",
            "Status": "modifying",
            "PendingModifiedValues": {},
            "MemberClusters": [
                "myrepliace",
                "my-cluster-001",
                "my-cluster-002",
                "my-cluster-003"
            ],
            "NodeGroups": [
                {
                    "NodeGroupId": "0001",
                    "Status": "modifying",
                    "PrimaryEndpoint": {
                        "Address": "my-cluster.xxxxx.ng.0001.usw2.cache.amazonaws.com",
                        "Port": 6379
                    },
                    "ReaderEndpoint": {
                        "Address": "my-cluster-ro.xxxxx.ng.0001.usw2.cache.amazonaws.com",
                        "Port": 6379
                    },
                    "NodeGroupMembers": [
                        {
                            "CacheClusterId": "myrepliace",
                            "CacheNodeId": "0001",
                            "ReadEndpoint": {
                                "Address": "myrepliace.xxxxx.0001.usw2.cache.amazonaws.com",
                                "Port": 6379
                            },
                            "PreferredAvailabilityZone": "us-west-2a",
                            "CurrentRole": "replica"
                        },
                        {
                            "CacheClusterId": "my-cluster-001",
                            "CacheNodeId": "0001",
                            "ReadEndpoint": {
                                "Address": "my-cluster-001.xxxxx.0001.usw2.cache.amazonaws.com",
                                "Port": 6379
                            },
                            "PreferredAvailabilityZone": "us-west-2a",
                            "CurrentRole": "primary"
                        },
                        {
                            "CacheClusterId": "my-cluster-002",
                            "CacheNodeId": "0001",
                            "ReadEndpoint": {
                                "Address": "my-cluster-002.xxxxx.0001.usw2.cache.amazonaws.com",
                                "Port": 6379
                            },
                            "PreferredAvailabilityZone": "us-west-2a",
                            "CurrentRole": "replica"
                        },
                        {
                            "CacheClusterId": "my-cluster-003",
                            "CacheNodeId": "0001",
                            "ReadEndpoint": {
                                "Address": "my-cluster-003.xxxxx.0001.usw2.cache.amazonaws.com",
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

For more information, see `Changing the Number of Replicas <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/increase-decrease-replica-count.html>`__ in the *Elasticache User Guide*.
