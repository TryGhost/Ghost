**To diassociate a secondary cluster from a global replication group**

The following ``disassociate-global-replication-group`` example removes a secondary cluster from a Global datastore ::

    aws elasticache disassociate-global-replication-group \
        --global-replication-group-id my-grg \
        --replication-group-id my-cluster-grg-secondary \
        --replication-group-region us-east-1

Output::

    {
        "GlobalReplicationGroup": {
            "GlobalReplicationGroupId": "my-grg",
            "GlobalReplicationGroupDescription": "my-grg",
            "Status": "modifying",
            "CacheNodeType": "cache.r5.large",
            "Engine": "redis",
            "EngineVersion": "5.0.6",
            "Members": [
                {
                    "ReplicationGroupId": "my-cluster-grg-secondary",
                    "ReplicationGroupRegion": "us-east-1",
                    "Role": "SECONDARY",
                    "AutomaticFailover": "enabled",
                    "Status": "associated"
                },
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

For more information, see `Replication Across AWS Regions Using Global Datastore <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Redis-Global-Datastore.html>`__ in the *Elasticache User Guide*.