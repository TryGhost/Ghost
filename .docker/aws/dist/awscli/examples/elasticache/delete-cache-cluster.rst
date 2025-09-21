**To delete a cache cluster**

The following ``delete-cache-cluster`` example deletes the specified previously provisioned cluster. The command deletes all associated cache nodes, node endpoints. and the cluster itself. When you receive a successful response from this operation, Amazon ElastiCache immediately begins deleting the cluster; you can't cancel or revert this operation.

This operation is not valid for the following:

* Redis (cluster mode enabled) clusters
* A cluster that is the last read replica of a replication group
* A node group (shard) that has Multi-AZ mode enabled
* A cluster from a Redis (cluster mode enabled) replication group
* A cluster that is not in the available state ::

    aws elasticache delete-cache-cluster \
        --cache-cluster-id "my-cluster-002"

Output::

    {
        "CacheCluster": {
            "CacheClusterId": "my-cluster-002",
            "ClientDownloadLandingPage": "https://console.aws.amazon.com/elasticache/home#client-download:",
            "CacheNodeType": "cache.r5.xlarge",
            "Engine": "redis",
            "EngineVersion": "5.0.5",
            "CacheClusterStatus": "deleting",
            "NumCacheNodes": 1,
            "PreferredAvailabilityZone": "us-west-2a",
            "CacheClusterCreateTime": "2019-11-26T03:35:04.546Z",
            "PreferredMaintenanceWindow": "mon:04:05-mon:05:05",
            "PendingModifiedValues": {},
            "NotificationConfiguration": {
                "TopicArn": "arn:aws:sns:us-west-x:xxxxxxx4152:My_Topic",
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
                    "SecurityGroupId": "sg-xxxxxxxxxx9836",
                    "Status": "active"
                },
                {
                    "SecurityGroupId": "sg-xxxxxxxxxxxx7b",
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

For more information, see `Deleting a Cluster <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Clusters.Delete.html>`__ in the *Elasticache User Guide*.
