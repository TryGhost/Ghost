**To restore an Amazon DocumentDB cluster to a point-in-time from a manual snapshot**

The following ``restore-db-cluster-to-point-in-time`` example uses the ``sample-cluster-snapshot`` to create a new Amazon DocumentDB cluster, ``sample-cluster-pit``, using the latest restorable time. ::

    aws docdb restore-db-cluster-to-point-in-time \
        --db-cluster-identifier sample-cluster-pit \
        --source-db-cluster-identifier arn:aws:rds:us-west-2:123456789012:cluster:sample-cluster \
        --use-latest-restorable-time

Output::

    {
        "DBCluster": {
            "StorageEncrypted": false,
            "BackupRetentionPeriod": 3,
            "MasterUsername": "master-user",
            "HostedZoneId": "ZNKXH85TT8WVW",
            "PreferredBackupWindow": "00:00-00:30",
            "MultiAZ": false,
            "DBClusterIdentifier": "sample-cluster-pit",
            "DBSubnetGroup": "default",
            "ClusterCreateTime": "2019-04-03T15:55:21.320Z",
            "AssociatedRoles": [],
            "DBClusterParameterGroup": "default.docdb3.6",
            "DBClusterMembers": [],
            "Status": "creating",
            "AvailabilityZones": [
                "us-west-2a",
                "us-west-2d",
                "us-west-2b"
            ],
            "ReaderEndpoint": "sample-cluster-pit.cluster-ro-corcjozrlsfc.us-west-2.docdb.amazonaws.com",
            "Port": 27017,
            "Engine": "docdb",
            "EngineVersion": "3.6.0",
            "VpcSecurityGroups": [
                {
                    "VpcSecurityGroupId": "sg-77186e0d",
                    "Status": "active"
                }
            ],
            "PreferredMaintenanceWindow": "sat:04:30-sat:05:00",
            "Endpoint": "sample-cluster-pit.cluster-corcjozrlsfc.us-west-2.docdb.amazonaws.com",
            "DbClusterResourceId": "cluster-NLCABBXOSE2QPQ4GOLZIFWEPLM",
            "DBClusterArn": "arn:aws:rds:us-west-2:123456789012:cluster:sample-cluster-pit"
        }
    }

For more information, see `Restoring a Snapshot to a Point in Time <https://docs.aws.amazon.com/documentdb/latest/developerguide/backup-restore.point-in-time-recovery.html>`__ in the *Amazon DocumentDB Developer Guide*.
