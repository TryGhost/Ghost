**To stop a DB instance**

The following ``stop-db-instance`` example stops the specified DB instance. ::

    aws rds stop-db-instance \
        --db-instance-identifier test-instance

Output::

    {
        "DBInstance": {
            "DBInstanceStatus": "stopping",
            ...some output truncated...
        }
    }
