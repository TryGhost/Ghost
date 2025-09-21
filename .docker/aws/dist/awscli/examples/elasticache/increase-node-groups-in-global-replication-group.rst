**To increase the number of node groups in a global replication group**

The following ``increase-node-groups-in-global-replication-group`` increases the node group count using the Redis engine. ::

    aws elasticache increase-node-groups-in-global-replication-group \
        --global-replication-group-id sgaui-pat-test-4 \
        --node-group-count 6 \
        --apply-immediately

Output::

    {
        "GlobalReplicationGroup": {
            "GlobalReplicationGroupId": "sgaui-test-4",
            "GlobalReplicationGroupDescription": "test-4",
            "Status": "modifying",
            "CacheNodeType": "cache.r5.large",
            "Engine": "redis",
            "EngineVersion": "5.0.6",
            "Members": [
                {
                    "ReplicationGroupId": "my-cluster-b",
                    "ReplicationGroupRegion": "us-east-1",
                    "Role": "SECONDARY",
                    "AutomaticFailover": "enabled",
                    "Status": "associated"
                },
                {
                    "ReplicationGroupId": "my-cluster-a",
                    "ReplicationGroupRegion": "us-west-2",
                    "Role": "PRIMARY",
                    "AutomaticFailover": "enabled",
                    "Status": "associated"
                }
            ],
            "ClusterEnabled": true,
            "GlobalNodeGroups": [
                {
                    "GlobalNodeGroupId": "sgaui-test-4-0001",
                    "Slots": "0-234,2420-5461"
                },
                {
                    "GlobalNodeGroupId": "sgaui-test-4-0002",
                    "Slots": "5462-5904,6997-9830"
                },
                {
                    "GlobalNodeGroupId": "sgaui-test-4-0003",
                    "Slots": "10923-11190,13375-16383"
                },
                {
                    "GlobalNodeGroupId": "sgaui-test-4-0004",
                    "Slots": "235-2419,5905-6996"
                },
                {
                    "GlobalNodeGroupId": "sgaui-test-4-0005",
                    "Slots": "9831-10922,11191-13374"
                }
            ],
            "AuthTokenEnabled": false,
            "TransitEncryptionEnabled": false,
            "AtRestEncryptionEnabled": false
        }
    }

For more information, see `Replication Across AWS Regions Using Global Datastore <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Redis-Global-Datastore.html>`__ in the *Elasticache User Guide*.