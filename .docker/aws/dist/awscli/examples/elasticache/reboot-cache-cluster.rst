**To reboot a cache cluster**

The following ``reboot-cache-cluster`` example reboots some, or all, of the cache nodes within a provisioned cluster. This operation applies any modified cache parameter groups to the cluster. The reboot operation takes place as soon as possible, and results in a momentary outage to the cluster. During the reboot, the cluster status is set to ``REBOOTING``. :: 

    aws elasticache reboot-cache-cluster \
        --cache-cluster-id "my-cluster-001" \
        --cache-node-ids-to-reboot "0001" 

Output::

    {
        "CacheCluster": {
            "CacheClusterId": "my-cluster-001",
            "ClientDownloadLandingPage": "https://console.aws.amazon.com/elasticache/home#client-download:",
            "CacheNodeType": "cache.r5.xlarge",
            "Engine": "redis",
            "EngineVersion": "5.0.5",
            "CacheClusterStatus": "rebooting cache cluster nodes",
            "NumCacheNodes": 1,
            "PreferredAvailabilityZone": "us-west-2a",
            "CacheClusterCreateTime": "2019-11-26T03:35:04.546Z",
            "PreferredMaintenanceWindow": "mon:04:05-mon:05:05",
            "PendingModifiedValues": {},
            "NotificationConfiguration": {
                "TopicArn": "arn:aws:sns:us-west-2:xxxxxxxxxx152:My_Topic",
                "TopicStatus": "active"
            },
            "CacheSecurityGroups": [],
            "CacheParameterGroup": {
                "CacheParameterGroupName": "mygroup",
                "ParameterApplyStatus": "in-sync",
                "CacheNodeIdsToReboot": []
            },
            "CacheSubnetGroupName": "kxkxk",
            "AutoMinorVersionUpgrade": true,
            "SecurityGroups": [
                {
                    "SecurityGroupId": "sg-xxxxxxxxxxxxx836",
                    "Status": "active"
                },
                {
                    "SecurityGroupId": "sg-xxxxxxxx7b",
                    "Status": "active"
                }
            ],
            "ReplicationGroupId": "my-cluster",
            "SnapshotRetentionLimit": 0,
            "SnapshotWindow": "07:30-08:30",
            "TransitEncryptionEnabled": false,
            "AtRestEncryptionEnabled": false
        }
    }

For more information, see `Rebooting a Cluster <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Clusters.Rebooting.html`__ in the *Elasticache User Guide*.
