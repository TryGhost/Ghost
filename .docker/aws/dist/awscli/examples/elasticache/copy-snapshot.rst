**To copy a snapshot**

The following ``copy-snapshot`` example makes a copy of an existing snapshot. ::

    aws elasticache copy-snapshot \
        --source-snapshot-name "my-snapshot" \
        --target-snapshot-name "my-snapshot-copy"

Output::

    {
        "Snapshot":{
            "Engine": "redis", 
            "CacheParameterGroupName": "default.redis3.2", 
            "VpcId": "vpc-3820329f3", 
            "CacheClusterId": "my-redis4", 
            "SnapshotRetentionLimit": 7, 
            "NumCacheNodes": 1, 
            "SnapshotName": "my-snapshot-copy", 
            "CacheClusterCreateTime": "2016-12-21T22:24:04.955Z", 
            "AutoMinorVersionUpgrade": true, 
            "PreferredAvailabilityZone": "us-east-1c", 
            "SnapshotStatus": "creating", 
            "SnapshotSource": "manual", 
            "SnapshotWindow": "07:00-08:00", 
            "EngineVersion": "3.2.4", 
            "NodeSnapshots": [
                {
                    "CacheSize": "3 MB", 
                    "SnapshotCreateTime": "2016-12-28T07:00:52Z", 
                    "CacheNodeId": "0001", 
                    "CacheNodeCreateTime": "2016-12-21T22:24:04.955Z"
                }
            ], 
            "CacheSubnetGroupName": "default", 
            "Port": 6379, 
            "PreferredMaintenanceWindow": "tue:09:30-tue:10:30", 
            "CacheNodeType": "cache.m3.large"
        }
    }

For more information, see `Exporting a Backup <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/backups-exporting.html>`__ in the *Elasticache User Guide*.
