**To create a cache cluster**

The following ``create-cache-cluster`` example creates a cache cluster using the Redis engine. ::

    aws elasticache create-cache-cluster \
        --cache-cluster-id "cluster-test" \
        --engine redis \
        --cache-node-type cache.m5.large \
        --num-cache-nodes 1


Output::

    {
        "CacheCluster": {
            "CacheClusterId": "cluster-test",
            "ClientDownloadLandingPage": "https://console.aws.amazon.com/elasticache/home#client-download:",
            "CacheNodeType": "cache.m5.large",
            "Engine": "redis",
            "EngineVersion": "5.0.5",
            "CacheClusterStatus": "creating",
            "NumCacheNodes": 1,
            "PreferredMaintenanceWindow": "sat:13:00-sat:14:00",
            "PendingModifiedValues": {},
            "CacheSecurityGroups": [],
            "CacheParameterGroup": {
                "CacheParameterGroupName": "default.redis5.0",
                "ParameterApplyStatus": "in-sync",
                "CacheNodeIdsToReboot": []
            },
            "CacheSubnetGroupName": "default",
            "AutoMinorVersionUpgrade": true,
            "SnapshotRetentionLimit": 0,
            "SnapshotWindow": "06:30-07:30",
            "TransitEncryptionEnabled": false,
            "AtRestEncryptionEnabled": false
        }
    }

For more information, see `Creating a Cluster <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Clusters.Create.html>`__ in the *Elasticache User Guide*.