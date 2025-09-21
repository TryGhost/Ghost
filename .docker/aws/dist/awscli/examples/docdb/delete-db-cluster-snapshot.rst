**To delete an Amazon DocumentDB cluster snapshot**

The following ``delete-db-cluster-snapshot`` example deletes the Amazon DocumentDB cluster snapshot ``sample-cluster-snapshot``. ::

    aws docdb delete-db-cluster-snapshot \
        --db-cluster-snapshot-identifier sample-cluster-snapshot

Output::

    {
        "DBClusterSnapshot": {
            "DBClusterIdentifier": "sample-cluster",
            "AvailabilityZones": [
                "us-west-2a",
                "us-west-2b",
                "us-west-2c",
                "us-west-2d"
            ],
            "DBClusterSnapshotIdentifier": "sample-cluster-snapshot",
            "VpcId": "vpc-91280df6",
            "DBClusterSnapshotArn": "arn:aws:rds:us-west-2:123456789012:cluster-snapshot:sample-cluster-snapshot",
            "EngineVersion": "3.6.0",
            "Engine": "docdb",
            "SnapshotCreateTime": "2019-03-18T18:27:14.794Z",
            "Status": "available",
            "MasterUsername": "master-user",
            "ClusterCreateTime": "2019-03-15T20:29:58.836Z",
            "PercentProgress": 100,
            "StorageEncrypted": false,
            "SnapshotType": "manual",
            "Port": 0
        }
    }


For more information, see `Deleting a Cluster Snapshot <https://docs.aws.amazon.com/documentdb/latest/developerguide/backup-restore.db-cluster-snapshot-delete.html>`__ in the *Amazon DocumentDB Developer Guide*.
