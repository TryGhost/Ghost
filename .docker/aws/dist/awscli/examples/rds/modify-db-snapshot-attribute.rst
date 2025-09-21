**Example 1: To enable two AWS accounts to restore a DB snapshot**

The following ``modify-db-snapshot-attribute`` example grants permission to two AWS accounts, with the identifiers ``111122223333`` and ``444455556666``, to restore the DB snapshot named ``mydbsnapshot``. ::

    aws rds modify-db-snapshot-attribute \
        --db-snapshot-identifier mydbsnapshot \
        --attribute-name restore \
        --values-to-add {"111122223333","444455556666"}

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

**Example 2: To prevent an AWS account from restoring a DB snapshot**

The following ``modify-db-snapshot-attribute`` example removes permission from a particular AWS account to restore the DB snapshot named ``mydbsnapshot``. When specifying a single account, the account identifier can't be surrounded by quotations marks or braces. ::

    aws rds modify-db-snapshot-attribute \
        --db-snapshot-identifier mydbsnapshot \
        --attribute-name restore \
        --values-to-remove 444455556666

Output::

    {
        "DBSnapshotAttributesResult": {
            "DBSnapshotIdentifier": "mydbsnapshot",
            "DBSnapshotAttributes": [
                {
                    "AttributeName": "restore",
                    "AttributeValues": [
                        "111122223333"
                    ]
                }
            ]
        }
    }

For more information, see `Sharing a Snapshot <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ShareSnapshot.html#USER_ShareSnapshot.Sharing>`__ in the *Amazon RDS User Guide*.