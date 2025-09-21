**To describe snapshots**

The following ''describe-snapshots'' example returns information about your cluster or replication group snapshots. ::

    aws elasticache describe-snapshots 

Output::

    {
        "Snapshots": [
            {
                "SnapshotName": "automatic.my-cluster2-002-2019-12-05-06-38",
                "CacheClusterId": "my-cluster2-002",
                "SnapshotStatus": "available",
                "SnapshotSource": "automated",
                "CacheNodeType": "cache.r5.large",
                "Engine": "redis",
                "EngineVersion": "5.0.5",
                "NumCacheNodes": 1,
                "PreferredAvailabilityZone": "us-west-2a",
                "CacheClusterCreateTime": "2019-11-26T01:22:52.396Z",
                "PreferredMaintenanceWindow": "mon:17:30-mon:18:30",
                "TopicArn": "arn:aws:sns:us-west-2:xxxxxxxxx52:My_Topic",
                "Port": 6379,
                "CacheParameterGroupName": "default.redis5.0",
                "CacheSubnetGroupName": "kxkxk",
                "VpcId": "vpc-a3e97cdb",
                "AutoMinorVersionUpgrade": true,
                "SnapshotRetentionLimit": 1,
                "SnapshotWindow": "06:30-07:30",
                "NodeSnapshots": [
                    {
                        "CacheNodeId": "0001",
                        "CacheSize": "5 MB",
                        "CacheNodeCreateTime": "2019-11-26T01:22:52.396Z",
                        "SnapshotCreateTime": "2019-12-05T06:38:23Z"
                    }
                ]
            },
            {
                "SnapshotName": "myreplica-backup",
                "CacheClusterId": "myreplica",
                "SnapshotStatus": "available",
                "SnapshotSource": "manual",
                "CacheNodeType": "cache.r5.large",
                "Engine": "redis",
                "EngineVersion": "5.0.5",
                "NumCacheNodes": 1,
                "PreferredAvailabilityZone": "us-west-2a",
                "CacheClusterCreateTime": "2019-11-26T00:14:52.439Z",
                "PreferredMaintenanceWindow": "sat:10:00-sat:11:00",
                "TopicArn": "arn:aws:sns:us-west-2:xxxxxxxxxx152:My_Topic",
                "Port": 6379,
                "CacheParameterGroupName": "default.redis5.0",
                "CacheSubnetGroupName": "kxkxk",
                "VpcId": "vpc-a3e97cdb",
                "AutoMinorVersionUpgrade": true,
                "SnapshotRetentionLimit": 0,
                "SnapshotWindow": "09:00-10:00",
                "NodeSnapshots": [
                    {
                        "CacheNodeId": "0001",
                        "CacheSize": "5 MB",
                        "CacheNodeCreateTime": "2019-11-26T00:14:52.439Z",
                        "SnapshotCreateTime": "2019-11-26T00:25:01Z"
                    }
                ]
            },
            {
                "SnapshotName": "my-cluster",
                "CacheClusterId": "my-cluster-003",
                "SnapshotStatus": "available",
                "SnapshotSource": "manual",
                "CacheNodeType": "cache.r5.large",
                "Engine": "redis",
                "EngineVersion": "5.0.5",
                "NumCacheNodes": 1,
                "PreferredAvailabilityZone": "us-west-2a",
                "CacheClusterCreateTime": "2019-11-25T23:56:17.186Z",
                "PreferredMaintenanceWindow": "sat:10:00-sat:11:00",
                "TopicArn": "arn:aws:sns:us-west-2:xxxxxxxxxx152:My_Topic",
                "Port": 6379,
                "CacheParameterGroupName": "default.redis5.0",
                "CacheSubnetGroupName": "kxkxk",
                "VpcId": "vpc-a3e97cdb",
                "AutoMinorVersionUpgrade": true,
                "SnapshotRetentionLimit": 0,
                "SnapshotWindow": "09:00-10:00",
                "NodeSnapshots": [
                    {
                        "CacheNodeId": "0001",
                        "CacheSize": "5 MB",
                        "CacheNodeCreateTime": "2019-11-25T23:56:17.186Z",
                        "SnapshotCreateTime": "2019-11-26T03:08:33Z"
                    }
                ]
            }
        ]
    }

For more information, see `Backup and Restore for ElastiCache for Redis <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/backups.html>`__ in the *Elasticache User Guide*.

