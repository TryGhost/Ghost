**To create a manual Amazon DocumentDB cluster snapshot**

The following ``create-db-cluster-snapshot`` example creates an Amazon DB cluster snapshot named sample-cluster-snapshot. ::

    aws docdb create-db-cluster-snapshot \
       --db-cluster-identifier sample-cluster \
       --db-cluster-snapshot-identifier sample-cluster-snapshot

Output::

    {
        "DBClusterSnapshot": {
            "MasterUsername": "master-user",
            "SnapshotCreateTime": "2019-03-18T18:27:14.794Z",
            "AvailabilityZones": [
                "us-west-2a",
                "us-west-2b",
                "us-west-2c",
                "us-west-2d",
                "us-west-2e",
                "us-west-2f"
            ],
            "SnapshotType": "manual",
            "DBClusterSnapshotArn": "arn:aws:rds:us-west-2:123456789012:cluster-snapshot:sample-cluster-snapshot",
            "EngineVersion": "3.6.0",
            "PercentProgress": 0,
            "DBClusterSnapshotIdentifier": "sample-cluster-snapshot",
            "Engine": "docdb",
            "DBClusterIdentifier": "sample-cluster",
            "Status": "creating",
            "ClusterCreateTime": "2019-03-15T20:29:58.836Z",
            "Port": 0,
            "StorageEncrypted": false,
            "VpcId": "vpc-91280df6"
        }
    }

For more information, see `Creating a Manual Cluster Snapshot <https://docs.aws.amazon.com/documentdb/latest/developerguide/backup-restore.db-cluster-snapshot-create.html>`__ in the *Amazon DocumentDB Developer Guide*.
