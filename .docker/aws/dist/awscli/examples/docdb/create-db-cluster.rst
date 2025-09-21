**To create an Amazon DocumentDB cluster**

The following ``create-db-cluster`` example creates an Amazon DocumentDB cluster named ``sample-cluster`` with the preferred maintenance window on Sundays between 20:30 and 11:00. ::

    aws docdb create-db-cluster \
        --db-cluster-identifier sample-cluster \
        --engine docdb \
        --master-username master-user \
        --master-user-password password \
        --preferred-maintenance-window Sun:20:30-Sun:21:00

Output::

    {
        "DBCluster": {
            "DBClusterParameterGroup": "default.docdb3.6",
            "AssociatedRoles": [],
            "DBSubnetGroup": "default",
            "ClusterCreateTime": "2019-03-18T18:06:34.616Z",
            "Status": "creating",
            "Port": 27017,
            "PreferredMaintenanceWindow": "sun:20:30-sun:21:00",
            "HostedZoneId": "ZNKXH85TT8WVW",
            "DBClusterMembers": [],
            "Engine": "docdb",
            "DBClusterIdentifier": "sample-cluster",
            "PreferredBackupWindow": "10:12-10:42",
            "AvailabilityZones": [
                "us-west-2d",
                "us-west-2f",
                "us-west-2e"
            ],
            "MasterUsername": "master-user",
            "BackupRetentionPeriod": 1,
            "ReaderEndpoint": "sample-cluster.cluster-ro-corcjozrlsfc.us-west-2.docdb.amazonaws.com",
            "VpcSecurityGroups": [
                {
                    "VpcSecurityGroupId": "sg-77186e0d",
                    "Status": "active"
                }
            ],
            "StorageEncrypted": false,
            "DBClusterArn": "arn:aws:rds:us-west-2:123456789012:cluster:sample-cluster",
            "DbClusterResourceId": "cluster-L3R4YRSBUYDP4GLMTJ2WF5GH5Q",
            "MultiAZ": false,
            "Endpoint": "sample-cluster.cluster-corcjozrlsfc.us-west-2.docdb.amazonaws.com",
            "EngineVersion": "3.6.0"
        }
    }


For more information, see `Creating an Amazon DocumentDB Cluster <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-cluster-create.html>`__ in the *Amazon DocumentDB Developer Guide*.
