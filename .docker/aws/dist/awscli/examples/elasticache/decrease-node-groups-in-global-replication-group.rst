**To decrease the number of node groups in a global replication group**

The following ``decrease-node-groups-in-global-replication-group`` decreases the node group count using the Redis engine. ::

    aws elasticache decrease-node-groups-in-global-replication-group \
        --global-replication-group-id sgaui-test \
        --node-group-count 1 \
        --apply-immediately \
        --global-node-groups-to-retain sgaui-test-0003

Output::

    {
        "GlobalReplicationGroup": 
        {
            "GlobalReplicationGroupId": "sgaui-test",
            "GlobalReplicationGroupDescription": "test",
            "Status": "modifying",
            "CacheNodeType": "cache.r5.large",
            "Engine": "redis",
            "EngineVersion": "5.0.6",
            "Members": [
                {
                    "ReplicationGroupId": "test-2",
                    "ReplicationGroupRegion": "us-east-1",
                    "Role": "SECONDARY",
                    "AutomaticFailover": "enabled",
                    "Status": "associated"
                },
                {
                    "ReplicationGroupId": "test-1",
                    "ReplicationGroupRegion": "us-west-2",
                    "Role": "PRIMARY",
                    "AutomaticFailover": "enabled",
                    "Status": "associated"
                }
            ],
            "ClusterEnabled": true,
            "GlobalNodeGroups": [
                {
                    "GlobalNodeGroupId": "sgaui-test-0001",
                    "Slots": "0-449,1816-5461"
                },
                {
                    "GlobalNodeGroupId": "sgaui-test-0002",
                    "Slots": "6827-10922"
                },
                {
                    "GlobalNodeGroupId": "sgaui-test-0003",
                    "Slots": "10923-14052,15418-16383"
                },
                {
                    "GlobalNodeGroupId": "sgaui-test-0004",
                    "Slots": "450-1815,5462-6826,14053-15417"
                }
            ],
            "AuthTokenEnabled": false,
            "TransitEncryptionEnabled": false,
            "AtRestEncryptionEnabled": false
        }
    }

For more information, see `Replication Across AWS Regions Using Global Datastore <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Redis-Global-Datastore.html>`__ in the *Elasticache User Guide*.