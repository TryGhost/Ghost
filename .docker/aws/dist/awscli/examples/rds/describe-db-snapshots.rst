**Example 1: To describe a DB snapshot for a DB instance**

The following ``describe-db-snapshots`` example retrieves the details of a DB snapshot for a DB instance. ::

    aws rds describe-db-snapshots \
        --db-snapshot-identifier mydbsnapshot

Output::

    {
        "DBSnapshots": [
            {
                "DBSnapshotIdentifier": "mydbsnapshot",
                "DBInstanceIdentifier": "mysqldb",
                "SnapshotCreateTime": "2018-02-08T22:28:08.598Z",
                "Engine": "mysql",
                "AllocatedStorage": 20,
                "Status": "available",
                "Port": 3306,
                "AvailabilityZone": "us-east-1f",
                "VpcId": "vpc-6594f31c",
                "InstanceCreateTime": "2018-02-08T22:24:55.973Z",
                "MasterUsername": "mysqladmin",
                "EngineVersion": "5.6.37",
                "LicenseModel": "general-public-license",
                "SnapshotType": "manual",
                "OptionGroupName": "default:mysql-5-6",
                "PercentProgress": 100,
                "StorageType": "gp2",
                "Encrypted": false,
                "DBSnapshotArn": "arn:aws:rds:us-east-1:123456789012:snapshot:mydbsnapshot",
                "IAMDatabaseAuthenticationEnabled": false,
                "ProcessorFeatures": [],
                "DbiResourceId": "db-AKIAIOSFODNN7EXAMPLE"
            }
        ]
    }

For more information, see `Creating a DB Snapshot <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateSnapshot.html>`__ in the *Amazon RDS User Guide*.

**Example 2: To find the number of manual snapshots taken**

The following ``describe-db-snapshots`` example uses the ``length`` operator in the ``--query`` option to return the number of manual snapshots that have been taken in a particular AWS Region. ::

    aws rds describe-db-snapshots \
        --snapshot-type manual \
        --query "length(*[].{DBSnapshots:SnapshotType})" \
        --region eu-central-1

Output::

    35

For more information, see `Creating a DB Snapshot <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateSnapshot.html>`__ in the *Amazon RDS User Guide*.
