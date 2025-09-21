**Example 1: To modify a DB instance**

The following ``modify-db-instance`` example associates an option group and a parameter group with a compatible Microsoft SQL Server DB instance. The ``--apply-immediately`` parameter causes the option and parameter groups to be associated immediately, instead of waiting until the next maintenance window. ::

    aws rds modify-db-instance \
        --db-instance-identifier database-2 \
        --option-group-name test-se-2017 \
        --db-parameter-group-name test-sqlserver-se-2017 \
        --apply-immediately

Output::

    {
        "DBInstance": {
            "DBInstanceIdentifier": "database-2",
            "DBInstanceClass": "db.r4.large",
            "Engine": "sqlserver-se",
            "DBInstanceStatus": "available",

            ...output omitted...

            "DBParameterGroups": [
                {
                    "DBParameterGroupName": "test-sqlserver-se-2017",
                    "ParameterApplyStatus": "applying"
                }
            ],
            "AvailabilityZone": "us-west-2d",

            ...output omitted...

            "MultiAZ": true,
            "EngineVersion": "14.00.3281.6.v1",
            "AutoMinorVersionUpgrade": false,
            "ReadReplicaDBInstanceIdentifiers": [],
            "LicenseModel": "license-included",
            "OptionGroupMemberships": [
                {
                    "OptionGroupName": "test-se-2017",
                    "Status": "pending-apply"
                }
            ],
            "CharacterSetName": "SQL_Latin1_General_CP1_CI_AS",
            "SecondaryAvailabilityZone": "us-west-2c",
            "PubliclyAccessible": true,
            "StorageType": "gp2",

            ...output omitted...

            "DeletionProtection": false,
            "AssociatedRoles": [],
            "MaxAllocatedStorage": 1000
        }
    }

For more information, see `Modifying an Amazon RDS DB Instance <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.DBInstance.Modifying.html>`__ in the *Amazon RDS User Guide*.

**Example 2: To associate VPC security group with a DB instance**

The following ``modify-db-instance`` example associates a specific VPC security group and removes DB security groups from a DB instance::

    aws rds modify-db-instance \
        --db-instance-identifier dbName \
        --vpc-security-group-ids sg-ID

Output::

    {
    "DBInstance": {
        "DBInstanceIdentifier": "dbName",
        "DBInstanceClass": "db.t3.micro",
        "Engine": "mysql",
        "DBInstanceStatus": "available",
        "MasterUsername": "admin",
        "Endpoint": {
            "Address": "dbName.abcdefghijk.us-west-2.rds.amazonaws.com",
            "Port": 3306,
            "HostedZoneId": "ABCDEFGHIJK1234"
        },
        "AllocatedStorage": 20,
        "InstanceCreateTime": "2024-02-15T00:37:58.793000+00:00",
        "PreferredBackupWindow": "11:57-12:27",
        "BackupRetentionPeriod": 7,
        "DBSecurityGroups": [],
        "VpcSecurityGroups": [
            {
                "VpcSecurityGroupId": "sg-ID",
                "Status": "active"
            }
        ],
        ... output omitted ...
        "MultiAZ": false,
        "EngineVersion": "8.0.35",
        "AutoMinorVersionUpgrade": true,
        "ReadReplicaDBInstanceIdentifiers": [],
        "LicenseModel": "general-public-license",
        
        ... output ommited ...
        }
    }

For more information, see `Controlling access with security groups <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.RDSSecurityGroups.html>`__ in the *Amazon RDS User Guide*.