**Example 1: To restore a DB instance to a point in time**

The following ``restore-db-instance-to-point-in-time`` example restores ``test-instance`` to a new DB instance named ``restored-test-instance``, as of the specified time. ::

    aws rds restore-db-instance-to-point-in-time \
        --source-db-instance-identifier test-instance \
        --target-db-instance restored-test-instance \
        --restore-time 2018-07-30T23:45:00.000Z

Output::

    {
        "DBInstance": {
            "AllocatedStorage": 20,
            "DBInstanceArn": "arn:aws:rds:us-east-1:123456789012:db:restored-test-instance",
            "DBInstanceStatus": "creating",
            "DBInstanceIdentifier": "restored-test-instance",
            ...some output omitted...
        }
    }

For more information, see `Restoring a DB instance to a specified time <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html>`__ in the *Amazon RDS User Guide*.

**Example 2: To restore a DB instance to a specified time from a replicated backup**

The following ``restore-db-instance-to-point-in-time`` example restores an Oracle DB instance to the specified time from a replicated automated backup. ::

    aws rds restore-db-instance-to-point-in-time \
        --source-db-instance-automated-backups-arn "arn:aws:rds:us-west-2:123456789012:auto-backup:ab-jkib2gfq5rv7replzadausbrktni2bn4example" \
        --target-db-instance-identifier myorclinstance-from-replicated-backup \
        --restore-time 2020-12-08T18:45:00.000Z

Output::

    {
        "DBInstance": {
            "DBInstanceIdentifier": "myorclinstance-from-replicated-backup",
            "DBInstanceClass": "db.t3.micro",
            "Engine": "oracle-se2",
            "DBInstanceStatus": "creating",
            "MasterUsername": "admin",
            "DBName": "ORCL",
            "AllocatedStorage": 20,
            "PreferredBackupWindow": "07:45-08:15",
            "BackupRetentionPeriod": 14,
            ... some output omitted ...
            "DbiResourceId": "db-KGLXG75BGVIWKQT7NQ4EXAMPLE",
            "CACertificateIdentifier": "rds-ca-2019",
            "DomainMemberships": [],
            "CopyTagsToSnapshot": false,
            "MonitoringInterval": 0,
            "DBInstanceArn": "arn:aws:rds:us-west-2:123456789012:db:myorclinstance-from-replicated-backup",
            "IAMDatabaseAuthenticationEnabled": false,
            "PerformanceInsightsEnabled": false,
            "DeletionProtection": false,
            "AssociatedRoles": [],
            "TagList": []
        }
    }

For more information, see `Restoring to a specified time from a replicated backup <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReplicateBackups.html#AutomatedBackups.PiTR>`__ in the *Amazon RDS User Guide*.