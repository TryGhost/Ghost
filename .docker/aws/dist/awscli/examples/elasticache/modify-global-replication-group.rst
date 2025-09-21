**To modify a global replication group**

The following ``modify-global-replication-group`` modifies the properties of a global replication group, in this case disabling automatic failover, using the Redis engine. ::

    aws elasticache modify-global-replication-group \
        --global-replication-group-id sgaui-pat-group \
        --apply-immediately \
        --no-automatic-failover-enabled
        
Output ::

    {
        "GlobalReplicationGroup": {
            "GlobalReplicationGroupId": "sgaui-test-group",
            "GlobalReplicationGroupDescription": " ",
            "Status": "modifying",
            "CacheNodeType": "cache.r5.large",
            "Engine": "redis",
            "EngineVersion": "5.0.6",
            "ClusterEnabled": false,
            "AuthTokenEnabled": false,
            "TransitEncryptionEnabled": false,
            "AtRestEncryptionEnabled": false
        }
    }

For more information, see `Replication Across AWS Regions Using Global Datastore <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Redis-Global-Datastore.html>`__ in the *Elasticache User Guide*.