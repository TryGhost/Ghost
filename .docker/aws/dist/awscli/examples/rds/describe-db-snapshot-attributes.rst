**To describe the attribute names and values for a DB snapshot**

The following ``describe-db-snapshot-attributes`` example describes the attribute names and values for a DB snapshot. ::

    aws rds describe-db-snapshot-attributes \
        --db-snapshot-identifier mydbsnapshot

Output::

    {
        "DBSnapshotAttributesResult": {
            "DBSnapshotIdentifier": "mydbsnapshot",
            "DBSnapshotAttributes": [
                {
                    "AttributeName": "restore",
                    "AttributeValues": [
                        "123456789012",
                        "210987654321"
                    ]
                }
            ]
        }
    }

For more information, see `Sharing a DB Snapshot <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ShareSnapshot.html>`__ in the *Amazon RDS User Guide*.
