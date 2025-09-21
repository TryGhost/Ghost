**To get detailed information about one or more Amazon DocumentDB clusters.**

The following ``describe-db-clusters`` example displays details for the Amazon DocumentDB cluster ``sample-cluster``. By omitting the ``--db-cluster-identifier`` parameter you can get information of up to 100 clusters. ::

    aws docdb describe-db-clusters 
        --db-cluster-identifier sample-cluster

Output::

    {
        "DBClusters": [
            {
                "DBClusterParameterGroup": "default.docdb3.6",
                "Endpoint": "sample-cluster.cluster-corcjozrlsfc.us-west-2.docdb.amazonaws.com",
                "PreferredBackupWindow": "00:00-00:30",
                "DBClusterIdentifier": "sample-cluster",
                "ClusterCreateTime": "2019-03-15T20:29:58.836Z",
                "LatestRestorableTime": "2019-03-18T20:28:03.239Z",
                "MasterUsername": "master-user",
                "DBClusterMembers": [
                    {
                        "PromotionTier": 1,
                        "DBClusterParameterGroupStatus": "in-sync",
                        "IsClusterWriter": false,
                        "DBInstanceIdentifier": "sample-cluster"
                    },
                    {
                        "PromotionTier": 1,
                        "DBClusterParameterGroupStatus": "in-sync",
                        "IsClusterWriter": true,
                        "DBInstanceIdentifier": "sample-cluster2"
                    }
                ],
                "PreferredMaintenanceWindow": "sat:04:30-sat:05:00",
                "VpcSecurityGroups": [
                    {
                        "VpcSecurityGroupId": "sg-77186e0d",
                        "Status": "active"
                    }
                ],
                "Engine": "docdb",
                "ReaderEndpoint": "sample-cluster.cluster-ro-corcjozrlsfc.us-west-2.docdb.amazonaws.com",
                "DBSubnetGroup": "default",
                "MultiAZ": true,
                "AvailabilityZones": [
                    "us-west-2a",
                    "us-west-2c",
                    "us-west-2b"
                ],
                "EarliestRestorableTime": "2019-03-15T20:30:47.020Z",
                "DbClusterResourceId": "cluster-UP4EF2PVDDFVHHDJQTYDAIGHLE",
                "DBClusterArn": "arn:aws:rds:us-west-2:123456789012:cluster:sample-cluster",
                "BackupRetentionPeriod": 3,
                "HostedZoneId": "ZNKXH85TT8WVW",
                "StorageEncrypted": false,
                "EnabledCloudwatchLogsExports": [
                    "audit"
                ],
                "AssociatedRoles": [],
                "EngineVersion": "3.6.0",
                "Port": 27017,
                "Status": "available"
            }
        ]
    }

For more information, see `Describing Amazon DocumentDB Clusters <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-cluster-view-details.html>`__ in the *Amazon DocumentDB Developer Guide*.
