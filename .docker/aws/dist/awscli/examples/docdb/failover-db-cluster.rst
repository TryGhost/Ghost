**To force an Amazon DocumentDB cluster to failover to a replica**

The following ``failover-db-cluster`` example causes the primary instance in the Amazon DocumentDB cluster sample-cluster to failover to a replica. ::

    aws docdb failover-db-cluster \
        --db-cluster-identifier sample-cluster

Output::

    {
        "DBCluster": {
            "AssociatedRoles": [],
            "DBClusterIdentifier": "sample-cluster",
            "EngineVersion": "3.6.0",
            "DBSubnetGroup": "default",
            "MasterUsername": "master-user",
            "EarliestRestorableTime": "2019-03-15T20:30:47.020Z",
            "Endpoint": "sample-cluster.cluster-corcjozrlsfc.us-west-2.docdb.amazonaws.com",
            "AvailabilityZones": [
                "us-west-2a",
                "us-west-2c",
                "us-west-2b"
            ],
            "LatestRestorableTime": "2019-03-18T21:35:23.548Z",
            "PreferredMaintenanceWindow": "sat:04:30-sat:05:00",
            "PreferredBackupWindow": "00:00-00:30",
            "Port": 27017,
            "VpcSecurityGroups": [
                {
                    "VpcSecurityGroupId": "sg-77186e0d",
                    "Status": "active"
                }
            ],
            "StorageEncrypted": false,
            "ClusterCreateTime": "2019-03-15T20:29:58.836Z",
            "MultiAZ": true,
            "Status": "available",
            "DBClusterMembers": [
                {
                    "DBClusterParameterGroupStatus": "in-sync",
                    "IsClusterWriter": false,
                    "DBInstanceIdentifier": "sample-cluster",
                    "PromotionTier": 1
                },
                {
                    "DBClusterParameterGroupStatus": "in-sync",
                    "IsClusterWriter": true,
                    "DBInstanceIdentifier": "sample-cluster2",
                    "PromotionTier": 2
                }
            ],
            "EnabledCloudwatchLogsExports": [
                "audit"
            ],
            "DBClusterParameterGroup": "default.docdb3.6",
            "HostedZoneId": "ZNKXH85TT8WVW",
            "DBClusterArn": "arn:aws:rds:us-west-2:123456789012:cluster:sample-cluster",
            "BackupRetentionPeriod": 3,
            "DbClusterResourceId": "cluster-UP4EF2PVDDFVHHDJQTYDAIGHLE",
            "ReaderEndpoint": "sample-cluster.cluster-ro-corcjozrlsfc.us-west-2.docdb.amazonaws.com",
            "Engine": "docdb"
        }
    }

For more information, see `Amazon DocumentDB Failover <https://docs.aws.amazon.com/documentdb/latest/developerguide/failover.html>`__ in the *Amazon DocumentDB Developer Guide*.
