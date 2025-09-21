**To delete an Amazon DocumentDB cluster**

The following ``delete-db-cluster`` example deletes the Amazon DocumentDB cluster ``sample-cluster``. No backup of the cluster is made prior to deleting it. NOTE: You must delete all instances associated with the cluster before you can delete it. ::

    aws docdb delete-db-cluster \
        --db-cluster-identifier sample-cluster \
        --skip-final-snapshot

Output::

    {
        "DBCluster": {
            "DBClusterIdentifier": "sample-cluster",
            "DBSubnetGroup": "default",
            "EngineVersion": "3.6.0",
            "Engine": "docdb",
            "LatestRestorableTime": "2019-03-18T18:07:24.610Z",
            "PreferredMaintenanceWindow": "sun:20:30-sun:21:00",
            "StorageEncrypted": false,
            "EarliestRestorableTime": "2019-03-18T18:07:24.610Z",
            "Port": 27017,
            "VpcSecurityGroups": [
                {
                    "Status": "active",
                    "VpcSecurityGroupId": "sg-77186e0d"
                }
            ],
            "MultiAZ": false,
            "MasterUsername": "master-user",
            "DBClusterArn": "arn:aws:rds:us-west-2:123456789012:cluster:sample-cluster",
            "Status": "available",
            "PreferredBackupWindow": "10:12-10:42",
            "ReaderEndpoint": "sample-cluster.cluster-ro-corcjozrlsfc.us-west-2.docdb.amazonaws.com",
            "AvailabilityZones": [
                "us-west-2c",
                "us-west-2b",
                "us-west-2a"
            ],
            "Endpoint": "sample-cluster.cluster-corcjozrlsfc.us-west-2.docdb.amazonaws.com",
            "DbClusterResourceId": "cluster-L3R4YRSBUYDP4GLMTJ2WF5GH5Q",
            "ClusterCreateTime": "2019-03-18T18:06:34.616Z",
            "AssociatedRoles": [],
            "DBClusterParameterGroup": "default.docdb3.6",
            "HostedZoneId": "ZNKXH85TT8WVW",
            "BackupRetentionPeriod": 1,
            "DBClusterMembers": []
        }
    }


For more information, see `Deleting an Amazon DocumentDB Cluster <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-cluster-delete.html>`__ in the *Amazon DocumentDB Developer Guide*.
