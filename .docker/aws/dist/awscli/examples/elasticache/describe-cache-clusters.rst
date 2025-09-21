**To describe a cache cluster**

The following ``describe-cache-clusters`` example describes a cache cluster. ::

    aws elasticache describe-cache-clusters

Output::

    {
        "CacheClusters": [
        {
                "CacheClusterId": "my-cluster-003",
                "ClientDownloadLandingPage": "https://console.aws.amazon.com/elasticache/home#client-download:",
                "CacheNodeType": "cache.r5.large",
                "Engine": "redis",
                "EngineVersion": "5.0.5",
                "CacheClusterStatus": "available",
                "NumCacheNodes": 1,
                "PreferredAvailabilityZone": "us-west-2a",
                "CacheClusterCreateTime": "2019-11-26T01:22:52.396Z",
                "PreferredMaintenanceWindow": "mon:17:30-mon:18:30",
                "PendingModifiedValues": {},
                "NotificationConfiguration": {
                    "TopicArn": "arn:aws:sns:us-west-2:xxxxxxxxxxx152:My_Topic",
                    "TopicStatus": "active"
                },
                "CacheSecurityGroups": [],
                "CacheParameterGroup": {
                    "CacheParameterGroupName": "default.redis5.0",
                    "ParameterApplyStatus": "in-sync",
                    "CacheNodeIdsToReboot": []
                },
                "CacheSubnetGroupName": "kxkxk",
                "AutoMinorVersionUpgrade": true,
                "SecurityGroups": [
                    {
                        "SecurityGroupId": "sg-xxxxxd7b",
                        "Status": "active"
                    }
                ],
                "ReplicationGroupId": "my-cluster",
                "SnapshotRetentionLimit": 0,
                "SnapshotWindow": "06:30-07:30",
                "AuthTokenEnabled": false,
                "TransitEncryptionEnabled": false,
                "AtRestEncryptionEnabled": false,
                "ARN": "arn:aws:elasticache:us-west-2:xxxxxxxxxxx152:cluster:my-cache-cluster",
                "ReplicationGroupLogDeliveryEnabled": false,
                "LogDeliveryConfigurations": [
                    {
                        "LogType": "slow-log",
                        "DestinationType": "cloudwatch-logs",
                        "DestinationDetails": {
                            "CloudWatchLogsDetails": {
                                "LogGroup": "test-log"
                            }
                        },
                        "LogFormat": "text",
                        "Status": "active"
                    }
                ]
            }
        ]
    }

For more information, see `Managing Clusters <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Clusters.html>`__ in the *Elasticache User Guide*.