**To modify an Amazon DocumentDB instance**

The following ``modify-db-instance`` example modifies the Amazon DocumentDB instance ``sample-cluster2`` by changing its instance class to ``db.r4.4xlarge`` and its promotion tier to ``5``. The changes are applied immediately but can only be seen after the instances status is available. ::

    aws docdb modify-db-instance \
        --db-instance-identifier sample-cluster2 \
        --apply-immediately \
        --db-instance-class db.r4.4xlarge \
        --promotion-tier 5

Output::

    {
        "DBInstance": {
            "EngineVersion": "3.6.0",
            "StorageEncrypted": false,
            "DBInstanceClass": "db.r4.large",
            "PreferredMaintenanceWindow": "mon:08:39-mon:09:09",
            "AutoMinorVersionUpgrade": true,
            "VpcSecurityGroups": [
                {
                    "VpcSecurityGroupId": "sg-77186e0d",
                    "Status": "active"
                }
            ],
            "PreferredBackupWindow": "18:00-18:30",
            "EnabledCloudwatchLogsExports": [
                "audit"
            ],
            "AvailabilityZone": "us-west-2f",
            "DBInstanceIdentifier": "sample-cluster2",
            "InstanceCreateTime": "2019-03-15T20:36:06.338Z",
            "Engine": "docdb",
            "BackupRetentionPeriod": 7,
            "DBSubnetGroup": {
                "DBSubnetGroupName": "default",
                "DBSubnetGroupDescription": "default",
                "SubnetGroupStatus": "Complete",
                "Subnets": [
                    {
                        "SubnetIdentifier": "subnet-4e26d263",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2a"
                        },
                        "SubnetStatus": "Active"
                    },
                    {
                        "SubnetIdentifier": "subnet-afc329f4",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2c"
                        },
                        "SubnetStatus": "Active"
                    },
                    {
                        "SubnetIdentifier": "subnet-53ab3636",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2d"
                        },
                        "SubnetStatus": "Active"
                    },
                    {
                        "SubnetIdentifier": "subnet-991cb8d0",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2b"
                        },
                        "SubnetStatus": "Active"
                    }
                ],
                "VpcId": "vpc-91280df6"
            },
            "PromotionTier": 2,
            "Endpoint": {
                "Address": "sample-cluster2.corcjozrlsfc.us-west-2.docdb.amazonaws.com",
                "HostedZoneId": "ZNKXH85TT8WVW",
                "Port": 27017
            },
            "DbiResourceId": "db-A2GIKUV6KPOHITGGKI2NHVISZA",
            "DBClusterIdentifier": "sample-cluster",
            "DBInstanceArn": "arn:aws:rds:us-west-2:123456789012:db:sample-cluster2",
            "PendingModifiedValues": {
                "DBInstanceClass": "db.r4.4xlarge"
            },
            "PubliclyAccessible": false,
            "DBInstanceStatus": "available"
        }
    }

For more information, see `Modifying an Amazon DocumentDB Instance <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-instance-modify.html>`__ in the *Amazon DocumentDB Developer Guide*.
