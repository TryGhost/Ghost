**To create a DB snapshot**

The following ``create-db-snapshot`` example creates a DB snapshot. ::

    aws rds create-db-snapshot \
        --db-instance-identifier database-mysql \
        --db-snapshot-identifier mydbsnapshot

Output::

    {
        "DBSnapshot": {
            "DBSnapshotIdentifier": "mydbsnapshot",
            "DBInstanceIdentifier": "database-mysql",
            "Engine": "mysql",
            "AllocatedStorage": 100,
            "Status": "creating",
            "Port": 3306,
            "AvailabilityZone": "us-east-1b",
            "VpcId": "vpc-6594f31c",
            "InstanceCreateTime": "2019-04-30T15:45:53.663Z",
            "MasterUsername": "admin",
            "EngineVersion": "5.6.40",
            "LicenseModel": "general-public-license",
            "SnapshotType": "manual",
            "Iops": 1000,
            "OptionGroupName": "default:mysql-5-6",
            "PercentProgress": 0,
            "StorageType": "io1",
            "Encrypted": true,
            "KmsKeyId": "arn:aws:kms:us-east-1:123456789012:key/AKIAIOSFODNN7EXAMPLE",
            "DBSnapshotArn": "arn:aws:rds:us-east-1:123456789012:snapshot:mydbsnapshot",
            "IAMDatabaseAuthenticationEnabled": false,
            "ProcessorFeatures": [],
            "DbiResourceId": "db-AKIAIOSFODNN7EXAMPLE"
        }
    }

For more information, see `Creating a DB Snapshot <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateSnapshot.html>`__ in the *Amazon RDS User Guide*.
