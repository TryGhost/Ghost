**To modify cache clusters**

The following ``modify-cache-cluster`` example modifies the settings for the specified cluster. :: 

    aws elasticache modify-cache-cluster \
        --cache-cluster-id "my-cluster" \
        --num-cache-nodes 1

Output::

    {
        "CacheCluster": {
            "CacheClusterId": "my-cluster",
            "ClientDownloadLandingPage": "https://console.aws.amazon.com/elasticache/home#client-download:",
            "CacheNodeType": "cache.m5.large",
            "Engine": "redis",
            "EngineVersion": "5.0.5",
            "CacheClusterStatus": "available",
            "NumCacheNodes": 1,
            "PreferredAvailabilityZone": "us-west-2c",
            "CacheClusterCreateTime": "2019-12-04T18:24:56.652Z",
            "PreferredMaintenanceWindow": "sat:10:00-sat:11:00",
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
            "SnapshotWindow": "07:00-08:00",
            "TransitEncryptionEnabled": false,
            "AtRestEncryptionEnabled": false
        }
    }

For more information, see `Modifying an ElastiCache Cluster <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Clusters.Modify.html>`__ in the *Elasticache User Guide*.
