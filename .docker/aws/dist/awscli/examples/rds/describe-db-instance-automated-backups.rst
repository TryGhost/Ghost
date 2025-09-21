**To describe the automated backups for a DB instance**

The following ``describe-db-instance-automated-backups`` example displays details about the automated backups for the specified DB instance. The details include replicated automated backups in other AWS Regions. ::

    aws rds describe-db-instance-automated-backups \
        --db-instance-identifier new-orcl-db

Output::

    {
        "DBInstanceAutomatedBackups": [
            {
                "DBInstanceArn": "arn:aws:rds:us-east-1:123456789012:db:new-orcl-db",
                "DbiResourceId": "db-JKIB2GFQ5RV7REPLZA4EXAMPLE",
                "Region": "us-east-1",
                "DBInstanceIdentifier": "new-orcl-db",
                "RestoreWindow": {
                    "EarliestTime": "2020-12-07T21:05:20.939Z",
                    "LatestTime": "2020-12-07T21:05:20.939Z"
                },
                "AllocatedStorage": 20,
                "Status": "replicating",
                "Port": 1521,
                "InstanceCreateTime": "2020-12-04T15:28:31Z",
                "MasterUsername": "admin",
                "Engine": "oracle-se2",
                "EngineVersion": "12.1.0.2.v21",
                "LicenseModel": "bring-your-own-license",
                "OptionGroupName": "default:oracle-se2-12-1",
                "Encrypted": false,
                "StorageType": "gp2",
                "IAMDatabaseAuthenticationEnabled": false,
                "BackupRetentionPeriod": 14,
                "DBInstanceAutomatedBackupsArn": "arn:aws:rds:us-west-2:123456789012:auto-backup:ab-jkib2gfq5rv7replzadausbrktni2bn4example"
            }
        ]
    }

For more information, see `Finding information about replicated backups <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReplicateBackups.html#AutomatedBackups.Replicating.Describe>`__ in the *Amazon RDS User Guide*.