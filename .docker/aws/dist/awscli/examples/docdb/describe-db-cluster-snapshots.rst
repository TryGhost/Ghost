**To describe Amazon DocumentDB snapshots**

The following ``describe-db-cluster-snapshots`` example displays details for the Amazon DocumentDB snapshot ``sample-cluster-snapshot``. ::

    aws docdb describe-db-cluster-snapshots \
        --db-cluster-snapshot-identifier sample-cluster-snapshot

Output::

    {
        "DBClusterSnapshots": [
            {
                "AvailabilityZones": [
                    "us-west-2a",
                    "us-west-2b",
                    "us-west-2c",
                    "us-west-2d"
                ],
                "Status": "available",
                "DBClusterSnapshotArn": "arn:aws:rds:us-west-2:123456789012:cluster-snapshot:sample-cluster-snapshot",
                "SnapshotCreateTime": "2019-03-15T20:41:26.515Z",
                "SnapshotType": "manual",
                "DBClusterSnapshotIdentifier": "sample-cluster-snapshot",
                "DBClusterIdentifier": "sample-cluster",
                "MasterUsername": "master-user",
                "StorageEncrypted": false,
                "VpcId": "vpc-91280df6",
                "EngineVersion": "3.6.0",
                "PercentProgress": 100,
                "Port": 0,
                "Engine": "docdb",
                "ClusterCreateTime": "2019-03-15T20:29:58.836Z"
            }
        ]
    }

For more information, see `DescribeDBClusterSnapshots <https://docs.aws.amazon.com/documentdb/latest/developerguide/API_DescribeDBClusterSnapshots.html>`__ in the *Amazon DocumentDB Developer Guide*.
