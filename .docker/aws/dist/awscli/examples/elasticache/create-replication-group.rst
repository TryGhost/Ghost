**To create a replication group**

The following ``create-replication-group`` example creates a Redis (cluster mode disabled) or a Redis (cluster mode enabled) replication group. This operation is valid for Redis only. ::

    aws elasticache create-replication-group \
        --replication-group-id "mygroup" \
        --replication-group-description "my group" \
        --engine "redis" \
        --cache-node-type "cache.m5.large"

Output::

    {
        "ReplicationGroup": {
            "ReplicationGroupId": "mygroup",
            "Description": "my group",
            "Status": "creating",
            "PendingModifiedValues": {},
            "MemberClusters": [
                "mygroup-001"
            ],
            "AutomaticFailover": "disabled",
            "SnapshotRetentionLimit": 0,
            "SnapshotWindow": "06:00-07:00",
            "ClusterEnabled": false,
            "CacheNodeType": "cache.m5.large",
            "TransitEncryptionEnabled": false,
            "AtRestEncryptionEnabled": false
        }
    }

For more information, see `Creating a Redis Replication Group <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Replication.CreatingRepGroup.html>`__ in the *Elasticache User Guide*.
