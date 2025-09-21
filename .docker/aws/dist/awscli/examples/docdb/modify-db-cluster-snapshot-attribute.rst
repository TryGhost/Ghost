**Example 1: To add an attribute to an Amazon DocumentDB snapshot**

The following ``modify-db-cluster-snapshot-attribute`` example adds four attribute values to an Amazon DocumentDB cluster snapshot. ::

    aws docdb modify-db-cluster-snapshot-attribute \
        --db-cluster-snapshot-identifier sample-cluster-snapshot \
        --attribute-name restore \
        --values-to-add 123456789011 123456789012 123456789013

Output::

    {
        "DBClusterSnapshotAttributesResult": {
            "DBClusterSnapshotAttributes": [
                {
                    "AttributeName": "restore",
                    "AttributeValues": [
                        "123456789011",
                        "123456789012",
                        "123456789013"
                    ]
                }
            ],
            "DBClusterSnapshotIdentifier": "sample-cluster-snapshot"
        }
    }

**Example 2: To remove attributes from an Amazon DocumentDB snapshot**

The following ``modify-db-cluster-snapshot-attribute`` example removes two attribute values from an Amazon DocumentDB cluster snapshot. ::

    aws docdb modify-db-cluster-snapshot-attribute \
        --db-cluster-snapshot-identifier sample-cluster-snapshot \
        --attribute-name restore \
        --values-to-remove 123456789012

Output::

    {
        "DBClusterSnapshotAttributesResult": {
            "DBClusterSnapshotAttributes": [
                {
                    "AttributeName": "restore",
                    "AttributeValues": [
                        "123456789011",
                        "123456789013"
                    ]
                }
            ],
            "DBClusterSnapshotIdentifier": "sample-cluster-snapshot"
        }
    }

For more information, see `ModifyDBClusterSnapshotAttribute <https://docs.aws.amazon.com/documentdb/latest/developerguide/API_ModifyDBClusterSnapshotAttribute.html>`__ in the *Amazon DocumentDB Developer Guide*.
