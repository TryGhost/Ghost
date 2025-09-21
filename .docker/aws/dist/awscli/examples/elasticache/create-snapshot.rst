**To create a snapshot**

The following ``create-snapshot`` example creates a snapshot using the Redis engine. ::

    aws elasticache create-snapshot \
        --snapshot-name mysnapshot \
        --cache-cluster-id cluster-test

Output::

    {
        "Snapshot": {
            "SnapshotName": "mysnapshot",
            "CacheClusterId": "cluster-test",
            "SnapshotStatus": "creating",
            "SnapshotSource": "manual",
            "CacheNodeType": "cache.m5.large",
            "Engine": "redis",
            "EngineVersion": "5.0.5",
            "NumCacheNodes": 1,
            "PreferredAvailabilityZone": "us-west-2b",
            "CacheClusterCreateTime": "2020-03-19T03:12:01.483Z",
            "PreferredMaintenanceWindow": "sat:13:00-sat:14:00",
            "Port": 6379,
            "CacheParameterGroupName": "default.redis5.0",
            "CacheSubnetGroupName": "default",
            "VpcId": "vpc-a3e97cdb",
            "AutoMinorVersionUpgrade": true,
            "SnapshotRetentionLimit": 0,
            "SnapshotWindow": "06:30-07:30",
            "NodeSnapshots": [
                {
                    "CacheNodeId": "0001",
                    "CacheSize": "",
                    "CacheNodeCreateTime": "2020-03-19T03:12:01.483Z"
                }
            ]
        }
    }

For more information, see `Backup and Restore for ElastiCache for Redis <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/backups.html>`__ in the *Elasticache User Guide*.