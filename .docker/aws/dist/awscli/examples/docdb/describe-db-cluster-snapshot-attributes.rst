**To list an Amazon DocumentDB snapshot attribute names and values**

The following ``describe-db-cluster-snapshot-attributes`` example lists the attribute names and values for the Amazon DocumentDB snapshot ``sample-cluster-snapshot``. ::

    aws docdb describe-db-cluster-snapshot-attributes \
        --db-cluster-snapshot-identifier sample-cluster-snapshot

Output::

    {
        "DBClusterSnapshotAttributesResult": {
            "DBClusterSnapshotAttributes": [
                {
                    "AttributeName": "restore",
                    "AttributeValues": []
                }
            ],
            "DBClusterSnapshotIdentifier": "sample-cluster-snapshot"
        }
    }

For more information, see `DescribeDBClusterSnapshotAttributes <https://docs.aws.amazon.com/documentdb/latest/developerguide/API_DescribeDBClusterSnapshotAttributes.html>`__ in the *Amazon DocumentDB Developer Guide*.
