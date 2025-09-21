**To modify an Amazon DocumentDB cluster**

The following ``modify-db-cluster`` example modifies the Amazon DocumentDB cluster ``sample-cluster`` by making the retention period for automatic backups 7 days, and changing the preferred windows for both backups and maintenance. All changes are applied at the next maintenance window. ::

    aws docdb modify-db-cluster \
        --db-cluster-identifier sample-cluster \
        --no-apply-immediately \
        --backup-retention-period 7 \
        --preferred-backup-window 18:00-18:30 \
        --preferred-maintenance-window sun:20:00-sun:20:30

Output::

    {
        "DBCluster": {
            "Endpoint": "sample-cluster.cluster-corcjozrlsfc.us-west-2.docdb.amazonaws.com",
            "DBClusterMembers": [
                {
                    "DBClusterParameterGroupStatus": "in-sync",
                    "DBInstanceIdentifier": "sample-cluster",
                    "IsClusterWriter": true,
                    "PromotionTier": 1
                },
                {
                    "DBClusterParameterGroupStatus": "in-sync",
                    "DBInstanceIdentifier": "sample-cluster2",
                    "IsClusterWriter": false,
                    "PromotionTier": 2
                }
            ],
            "HostedZoneId": "ZNKXH85TT8WVW",
            "StorageEncrypted": false,
            "PreferredBackupWindow": "18:00-18:30",
            "MultiAZ": true,
            "EngineVersion": "3.6.0",
            "MasterUsername": "master-user",
            "ReaderEndpoint": "sample-cluster.cluster-ro-corcjozrlsfc.us-west-2.docdb.amazonaws.com",
            "DBSubnetGroup": "default",
            "LatestRestorableTime": "2019-03-18T22:08:13.408Z",
            "EarliestRestorableTime": "2019-03-15T20:30:47.020Z",
            "PreferredMaintenanceWindow": "sun:20:00-sun:20:30",
            "AssociatedRoles": [],
            "EnabledCloudwatchLogsExports": [
                "audit"
            ],
            "Engine": "docdb",
            "DBClusterParameterGroup": "default.docdb3.6",
            "DBClusterArn": "arn:aws:rds:us-west-2:123456789012:cluster:sample-cluster",
            "BackupRetentionPeriod": 7,
            "DBClusterIdentifier": "sample-cluster",
            "AvailabilityZones": [
                "us-west-2a",
                "us-west-2c",
                "us-west-2b"
            ],
            "Status": "available",
            "DbClusterResourceId": "cluster-UP4EF2PVDDFVHHDJQTYDAIGHLE",
            "ClusterCreateTime": "2019-03-15T20:29:58.836Z",
            "VpcSecurityGroups": [
                {
                    "VpcSecurityGroupId": "sg-77186e0d",
                    "Status": "active"
                }
            ],
            "Port": 27017
        }
    }

For more information, see `Modifying an Amazon DocumentDB Cluster <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-cluster-modify.html>`__ in the *Amazon DocumentDB Developer Guide*.
