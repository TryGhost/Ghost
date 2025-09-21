**To start a DB instance**

The following ``start-db-instance`` example starts the specified DB instance. ::

    aws rds start-db-instance \
        --db-instance-identifier test-instance

Output::

    {
        "DBInstance": {
            "DBInstanceStatus": "starting",
            ...some output truncated...
        }
    }
