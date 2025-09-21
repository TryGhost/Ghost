**To copy a DB snapshot**

The following ``copy-db-snapshot`` example creates a copy of a DB snapshot. :: 

    aws rds copy-db-snapshot \
        --source-db-snapshot-identifier rds:database-mysql-2019-06-06-08-38 
        --target-db-snapshot-identifier mydbsnapshotcopy

Output::

    {
        "DBSnapshot": {
            "VpcId": "vpc-6594f31c",
            "Status": "creating",
            "Encrypted": true,
            "SourceDBSnapshotIdentifier": "arn:aws:rds:us-east-1:123456789012:snapshot:rds:database-mysql-2019-06-06-08-38",
            "MasterUsername": "admin",
            "Iops": 1000,
            "Port": 3306,
            "LicenseModel": "general-public-license",
            "DBSnapshotArn": "arn:aws:rds:us-east-1:123456789012:snapshot:mydbsnapshotcopy",
            "EngineVersion": "5.6.40",
            "OptionGroupName": "default:mysql-5-6",
            "ProcessorFeatures": [],
            "Engine": "mysql",
            "StorageType": "io1",
            "DbiResourceId": "db-ZI7UJ5BLKMBYFGX7FDENCKADC4",
            "KmsKeyId": "arn:aws:kms:us-east-1:123456789012:key/AKIAIOSFODNN7EXAMPLE",
            "SnapshotType": "manual",
            "IAMDatabaseAuthenticationEnabled": false,
            "SourceRegion": "us-east-1",
            "DBInstanceIdentifier": "database-mysql",
            "InstanceCreateTime": "2019-04-30T15:45:53.663Z",
            "AvailabilityZone": "us-east-1f",
            "PercentProgress": 0,
            "AllocatedStorage": 100,
            "DBSnapshotIdentifier": "mydbsnapshotcopy"
        }
    }


For more information, see `Copying a Snapshot <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html>`__ in the *Amazon RDS User Guide*.
