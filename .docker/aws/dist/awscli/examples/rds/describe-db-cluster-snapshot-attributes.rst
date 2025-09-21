**To describe the attribute names and values for a DB cluster snapshot**

The following ``describe-db-cluster-snapshot-attributes`` example retrieves details of the attribute names and values for the specified DB cluster snapshot. ::

    aws rds describe-db-cluster-snapshot-attributes \
        --db-cluster-snapshot-identifier myclustersnapshot

Output::

    {
        "DBClusterSnapshotAttributesResult": {
            "DBClusterSnapshotIdentifier": "myclustersnapshot",
            "DBClusterSnapshotAttributes": [
                {
                    "AttributeName": "restore",
                    "AttributeValues": [
                        "123456789012"
                    ]
                }
            ]
        }
    }

For more information, see `Sharing a DB Cluster Snapshot <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_ShareSnapshot.html>`__ in the *Amazon Aurora User Guide*.
