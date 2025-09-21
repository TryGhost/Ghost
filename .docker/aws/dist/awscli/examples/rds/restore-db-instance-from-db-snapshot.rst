**To restore a DB instance from a DB snapshot**

The following ``restore-db-instance-from-db-snapshot`` example creates a new DB instance named ``db7-new-instance`` with the ``db.t3.small`` DB instance class from the specified DB snapshot. The source DB instance from which the snapshot was taken uses a deprecated DB instance class, so you can't upgrade it. ::

    aws rds restore-db-instance-from-db-snapshot \
        --db-instance-identifier db7-new-instance \
        --db-snapshot-identifier db7-test-snapshot \
        --db-instance-class db.t3.small


Output::

    {
        "DBInstance": {
            "DBInstanceIdentifier": "db7-new-instance",
            "DBInstanceClass": "db.t3.small",
            "Engine": "mysql",
            "DBInstanceStatus": "creating",

            ...output omitted...

            "PreferredMaintenanceWindow": "mon:07:37-mon:08:07",
            "PendingModifiedValues": {},
            "MultiAZ": false,
            "EngineVersion": "5.7.22",
            "AutoMinorVersionUpgrade": true,
            "ReadReplicaDBInstanceIdentifiers": [],
            "LicenseModel": "general-public-license",

            ...output omitted...

            "DBInstanceArn": "arn:aws:rds:us-west-2:123456789012:db:db7-new-instance",
            "IAMDatabaseAuthenticationEnabled": false,
            "PerformanceInsightsEnabled": false,
            "DeletionProtection": false,
            "AssociatedRoles": []
        }
    }

For more information, see `Restoring from a DB Snapshot <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html>`__ in the *Amazon RDS User Guide*.
