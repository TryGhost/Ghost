**To delete a replicated automated backup from a Region**

The following ``delete-db-instance-automated-backup`` example deletes the automated backup with the specified Amazon Resource Name (ARN). ::

    aws rds delete-db-instance-automated-backup \
        --db-instance-automated-backups-arn "arn:aws:rds:us-west-2:123456789012:auto-backup:ab-jkib2gfq5rv7replzadausbrktni2bn4example"

Output::

    {
        "DBInstanceAutomatedBackup": {
            "DBInstanceArn": "arn:aws:rds:us-east-1:123456789012:db:new-orcl-db",
            "DbiResourceId": "db-JKIB2GFQ5RV7REPLZA4EXAMPLE",
            "Region": "us-east-1",
            "DBInstanceIdentifier": "new-orcl-db",
            "RestoreWindow": {},
            "AllocatedStorage": 20,
            "Status": "deleting",
            "Port": 1521,
            "AvailabilityZone": "us-east-1b",
            "VpcId": "vpc-########",
            "InstanceCreateTime": "2020-12-04T15:28:31Z",
            "MasterUsername": "admin",
            "Engine": "oracle-se2",
            "EngineVersion": "12.1.0.2.v21",
            "LicenseModel": "bring-your-own-license",
            "OptionGroupName": "default:oracle-se2-12-1",
            "Encrypted": false,
            "StorageType": "gp2",
            "IAMDatabaseAuthenticationEnabled": false,
            "BackupRetentionPeriod": 7,
            "DBInstanceAutomatedBackupsArn": "arn:aws:rds:us-west-2:123456789012:auto-backup:ab-jkib2gfq5rv7replzadausbrktni2bn4example"
        }
    }

For more information, see `Deleting replicated backups <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReplicateBackups.html#AutomatedBackups.Delete>`__ in the *Amazon RDS User Guide*.