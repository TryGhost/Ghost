**To delete a snapshot**

The following ``delete-snapshot`` example deleted a snapshot using the Redis engine. ::

    aws elasticache delete-snapshot \
        --snapshot-name mysnapshot

Output::

    {
        "Snapshot": {
            "SnapshotName": "my-cluster-snapshot",
            "ReplicationGroupId": "mycluster",
            "ReplicationGroupDescription": "mycluster",
            "SnapshotStatus": "deleting",
            "SnapshotSource": "manual",
            "CacheNodeType": "cache.r5.xlarge",
            "Engine": "redis",
            "EngineVersion": "5.0.5",
            "PreferredMaintenanceWindow": "thu:12:00-thu:13:00",
            "TopicArn": "arn:aws:sns:us-west-2:xxxxxxxxxxxxx152:My_Topic",
            "Port": 6379,
            "CacheParameterGroupName": "default.redis5.0.cluster.on",
            "CacheSubnetGroupName": "default",
            "VpcId": "vpc-a3e97cdb",
            "AutoMinorVersionUpgrade": true,
            "SnapshotRetentionLimit": 1,
            "SnapshotWindow": "13:00-14:00",
            "NumNodeGroups": 4,
            "AutomaticFailover": "enabled",
            "NodeSnapshots": [
                {
                    "CacheClusterId": "mycluster-0002-003",
                    "NodeGroupId": "0002",
                    "CacheNodeId": "0001",
                    "CacheSize": "6 MB",
                    "CacheNodeCreateTime": "2020-06-18T00:05:44.719000+00:00",
                    "SnapshotCreateTime": "2020-06-25T20:34:30+00:00"
                },
                {
                    "CacheClusterId": "mycluster-0003-003",
                    "NodeGroupId": "0003",
                    "CacheNodeId": "0001",
                    "CacheSize": "6 MB",
                    "CacheNodeCreateTime": "2019-12-05T19:13:15.912000+00:00",
                    "SnapshotCreateTime": "2020-06-25T20:34:30+00:00"
                },
                {
                    "CacheClusterId": "mycluster-0004-002",
                    "NodeGroupId": "0004",
                    "CacheNodeId": "0001",
                    "CacheSize": "6 MB",
                    "CacheNodeCreateTime": "2019-12-09T19:44:34.324000+00:00",
                    "SnapshotCreateTime": "2020-06-25T20:34:30+00:00"
                },
                {
                    "CacheClusterId": "mycluster-0005-003",
                    "NodeGroupId": "0005",
                    "CacheNodeId": "0001",
                    "CacheSize": "6 MB",
                    "CacheNodeCreateTime": "2020-06-18T00:05:44.775000+00:00",
                    "SnapshotCreateTime": "2020-06-25T20:34:30+00:00"
                }
            ]
        }
    }

For more information, see `Backup and Restore for ElastiCache for Redis <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/backups.html>`__ in the *Elasticache User Guide*.