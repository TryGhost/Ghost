**To promote a read replica**

The following ``promote-read-replica`` example promotes the specified read replica to become a standalone DB instance. ::

    aws rds promote-read-replica \
        --db-instance-identifier test-instance-repl

Output::

    {
        "DBInstance": {
            "DBInstanceArn": "arn:aws:rds:us-east-1:123456789012:db:test-instance-repl",
            "StorageType": "standard",
            "ReadReplicaSourceDBInstanceIdentifier": "test-instance",
            "DBInstanceStatus": "modifying",
            ...some output truncated...
        }
    }
