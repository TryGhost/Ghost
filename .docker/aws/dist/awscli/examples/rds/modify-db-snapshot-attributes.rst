**To modify a DB snapshot attribute**

The following ``modify-db-snapshot-attribute`` example permits two AWS account identifiers, ``111122223333`` and ``444455556666``, to restore the DB snapshot named ``mydbsnapshot``. ::

    aws rds modify-db-snapshot-attribute \
        --db-snapshot-identifier mydbsnapshot \
        --attribute-name restore \
        --values-to-add '["111122223333","444455556666"]'

Output::

    {
        "DBSnapshotAttributesResult": {
            "DBSnapshotIdentifier": "mydbsnapshot",
            "DBSnapshotAttributes": [
                {
                    "AttributeName": "restore",
                    "AttributeValues": [
                        "111122223333",
                        "444455556666"
                    ]
                }
            ]
        }
    }

For more information, see `Sharing a Snapshot <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ShareSnapshot.html#USER_ShareSnapshot.Sharing>`__ in the *Amazon RDS User Guide*.
