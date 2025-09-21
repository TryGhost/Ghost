**To stop a running Amazon DocumentDB cluster**

The following ``stop-db-cluster`` example stops the specified Amazon DocumentDB cluster. ::

    aws docdb stop-db-cluster \
        --db-cluster-identifier sample-cluster

Output::

    {
        "DBCluster": {
            "ClusterCreateTime": "2019-03-19T18:45:01.857Z",
            "HostedZoneId": "ZNKXH85TT8WVW",
            "Engine": "docdb",
            "DBClusterMembers": [],
            "MultiAZ": false,
            "AvailabilityZones": [
                "us-east-1a",
                "us-east-1c",
                "us-east-1f"
            ],
            "StorageEncrypted": false,
            "ReaderEndpoint": "sample-cluster-2019-03-16-00-01-restored.cluster-ro-corcjozrlsfc.us-east-1.docdb.amazonaws.com",
            "Endpoint": "sample-cluster-2019-03-16-00-01-restored.cluster-corcjozrlsfc.us-east-1.docdb.amazonaws.com",
            "Port": 27017,
            "PreferredBackupWindow": "00:00-00:30",
            "DBSubnetGroup": "default",
            "DBClusterIdentifier": "sample-cluster-2019-03-16-00-01-restored",
            "PreferredMaintenanceWindow": "sat:04:30-sat:05:00",
            "DBClusterArn": "arn:aws:rds:us-east-1:123456789012:cluster:sample-cluster-2019-03-16-00-01-restored",
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

For more information, see `Stopping and Starting an Amazon DocumentDB Cluster <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-cluster-stop-start.html>`__ in the *Amazon DocumentDB Developer Guide*.
