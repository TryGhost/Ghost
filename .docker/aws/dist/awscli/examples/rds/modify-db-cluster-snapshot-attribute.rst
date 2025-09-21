**To modify a DB cluster snapshot attribute**

The following ``modify-db-cluster-snapshot-attribute`` example makes changes to the specified DB cluster snapshot attribute. ::

    aws rds modify-db-cluster-snapshot-attribute \
        --db-cluster-snapshot-identifier myclustersnapshot \
        --attribute-name restore \
        --values-to-add 123456789012

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

For more information, see `Restoring from a DB Cluster Snapshot <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_RestoreFromSnapshot.html>`__ in the *Amazon Aurora User Guide*.
