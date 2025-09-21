**To delete a DB instance**

The following ``delete-db-instance`` example deletes the specified DB instance after creating a final DB snapshot named ``test-instance-final-snap``. ::

    aws rds delete-db-instance \
        --db-instance-identifier test-instance \
        --final-db-snapshot-identifier test-instance-final-snap

Output::

    {
        "DBInstance": {
            "DBInstanceIdentifier": "test-instance",
            "DBInstanceStatus": "deleting",
            ...some output truncated...
        }
    }
