**To delete a global replication group**

The following ``delete-global-replication-group`` example deletes a new global replication group. ::

    aws elasticache delete-global-replication-group \
        --global-replication-group-id my-global-replication-group \
        --retain-primary-replication-group

Output::

    {
        "GlobalReplicationGroup": {
            "GlobalReplicationGroupId": "sgaui-my-grg",
            "GlobalReplicationGroupDescription": "my-grg",
            "Status": "deleting",
            "CacheNodeType": "cache.r5.large",
            "Engine": "redis",
            "EngineVersion": "5.0.6",
            "Members": [
                {
                    "ReplicationGroupId": "my-cluster-grg",
                    "ReplicationGroupRegion": "us-west-2",
                    "Role": "PRIMARY",
                    "AutomaticFailover": "enabled",
                    "Status": "associated"
                }
            ],
            "ClusterEnabled": false,
            "AuthTokenEnabled": false,
            "TransitEncryptionEnabled": false,
            "AtRestEncryptionEnabled": false
        }
    }

For more information, see `Replication Across AWS Regions Using Global Datastore <https://docs.amazonaws.cn/en_us/AmazonElastiCache/latest/red-ug/Redis-Global-Datastore.html>`__ in the *Elasticache User Guide*.
