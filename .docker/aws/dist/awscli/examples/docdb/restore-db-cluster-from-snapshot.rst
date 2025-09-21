**To restore an Amazon DocumentDB cluster from an automatic or manual snapshot**

The following ``restore-db-cluster-from-snapshot`` example creates a new Amazon DocumentDB cluster named ``sample-cluster-2019-03-16-00-01-restored`` from the snapshot ``rds:sample-cluster-2019-03-16-00-01``. ::

    aws docdb restore-db-cluster-from-snapshot \
        --db-cluster-identifier sample-cluster-2019-03-16-00-01-restored \
        --engine docdb \
        --snapshot-identifier rds:sample-cluster-2019-03-16-00-01

Output::

    {
        "DBCluster": {
            "ClusterCreateTime": "2019-03-19T18:45:01.857Z",
            "HostedZoneId": "ZNKXH85TT8WVW",
            "Engine": "docdb",
            "DBClusterMembers": [],
            "MultiAZ": false,
            "AvailabilityZones": [
                "us-west-2a",
                "us-west-2c",
                "us-west-2b"
            ],
            "StorageEncrypted": false,
            "ReaderEndpoint": "sample-cluster-2019-03-16-00-01-restored.cluster-ro-corcjozrlsfc.us-west-2.docdb.amazonaws.com",
            "Endpoint": "sample-cluster-2019-03-16-00-01-restored.cluster-corcjozrlsfc.us-west-2.docdb.amazonaws.com",
            "Port": 27017,
            "PreferredBackupWindow": "00:00-00:30",
            "DBSubnetGroup": "default",
            "DBClusterIdentifier": "sample-cluster-2019-03-16-00-01-restored",
            "PreferredMaintenanceWindow": "sat:04:30-sat:05:00",
            "DBClusterArn": "arn:aws:rds:us-west-2:123456789012:cluster:sample-cluster-2019-03-16-00-01-restored",
            "DBClusterParameterGroup": "default.docdb3.6",
            "DbClusterResourceId": "cluster-XOO46Q3RH4LWSYNH3NMZKXPISU",
            "MasterUsername": "master-user",
            "EngineVersion": "3.6.0",
            "BackupRetentionPeriod": 3,
            "AssociatedRoles": [],
            "Status": "creating",
            "VpcSecurityGroups": [
                {
                    "Status": "active",
                    "VpcSecurityGroupId": "sg-77186e0d"
                }
            ]
        }
    }


For more information, see `Restoring from a Cluster Snapshot <https://docs.aws.amazon.com/documentdb/latest/developerguide/backup-restore.restore-from-snapshot.html>`__ in the *Amazon DocumentDB Developer Guide*.
