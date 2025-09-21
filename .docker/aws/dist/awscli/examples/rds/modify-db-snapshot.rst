**To modify a DB snapshot**

The following ``modify-db-snapshot`` example upgrades a PostgeSQL 10.6 snapshot named ``db5-snapshot-upg-test`` to PostgreSQL 11.7. The new DB engine version is shown after the snapshot has finished upgrading and its status is **available**. ::

    aws rds modify-db-snapshot \
        --db-snapshot-identifier db5-snapshot-upg-test \
        --engine-version 11.7

Output::

    {
        "DBSnapshot": {
            "DBSnapshotIdentifier": "db5-snapshot-upg-test",
            "DBInstanceIdentifier": "database-5",
            "SnapshotCreateTime": "2020-03-27T20:49:17.092Z",
            "Engine": "postgres",
            "AllocatedStorage": 20,
            "Status": "upgrading",
            "Port": 5432,
            "AvailabilityZone": "us-west-2a",
            "VpcId": "vpc-2ff27557",
            "InstanceCreateTime": "2020-03-27T19:59:04.735Z",
            "MasterUsername": "postgres",
            "EngineVersion": "10.6",
            "LicenseModel": "postgresql-license",
            "SnapshotType": "manual",
            "OptionGroupName": "default:postgres-11",
            "PercentProgress": 100,
            "StorageType": "gp2",
            "Encrypted": false,
            "DBSnapshotArn": "arn:aws:rds:us-west-2:123456789012:snapshot:db5-snapshot-upg-test",
            "IAMDatabaseAuthenticationEnabled": false,
            "ProcessorFeatures": [],
            "DbiResourceId": "db-GJMF75LM42IL6BTFRE4UZJ5YM4"
        }
    }

For more information, see `Upgrading a PostgreSQL DB Snapshot <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBSnapshot.PostgreSQL.html>`__ in the *Amazon RDS User Guide*.
