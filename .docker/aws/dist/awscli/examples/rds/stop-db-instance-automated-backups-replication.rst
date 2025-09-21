**To stop replicating automated backups**

The following ``stop-db-instance-automated-backups-replication`` ends replication of automated backups to the US West (Oregon) Region. Replicated backups are retained according to the set backup retention period. ::

    aws rds stop-db-instance-automated-backups-replication \
        --region us-west-2 \
        --source-db-instance-arn "arn:aws:rds:us-east-1:123456789012:db:new-orcl-db"

Output::

    {
        "DBInstanceAutomatedBackup": {
            "DBInstanceArn": "arn:aws:rds:us-east-1:123456789012:db:new-orcl-db",
            "DbiResourceId": "db-JKIB2GFQ5RV7REPLZA4EXAMPLE",
            "Region": "us-east-1",
            "DBInstanceIdentifier": "new-orcl-db",
            "RestoreWindow": {
                "EarliestTime": "2020-12-04T23:13:21.030Z",
                "LatestTime": "2020-12-07T19:59:57Z"
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
            "BackupRetentionPeriod": 7,
            "DBInstanceAutomatedBackupsArn": "arn:aws:rds:us-west-2:123456789012:auto-backup:ab-jkib2gfq5rv7replzadausbrktni2bn4example"
        }
    }

For more information, see `Stopping automated backup replication <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReplicateBackups.html#AutomatedBackups.StopReplicating>`__ in the *Amazon RDS User Guide*.