**To create an Amazon DocumentDB cluster instance**

The following ``create-db-instance`` example code creates the instance ``sample-cluster-instance-2`` in the Amazon DocumentDB cluster ``sample-cluster``. ::

    aws docdb create-db-instance \
        --db-cluster-identifier sample-cluster \
        --db-instance-class db.r4.xlarge \
        --db-instance-identifier sample-cluster-instance-2 \
        --engine docdb

Output::

    {
        "DBInstance": {
            "DBInstanceStatus": "creating",
            "PendingModifiedValues": {
                "PendingCloudwatchLogsExports": {
                    "LogTypesToEnable": [
                        "audit"
                    ]
                }
            },
            "PubliclyAccessible": false,
            "PreferredBackupWindow": "00:00-00:30",
            "PromotionTier": 1,
            "EngineVersion": "3.6.0",
            "BackupRetentionPeriod": 3,
            "DBInstanceIdentifier": "sample-cluster-instance-2",
            "PreferredMaintenanceWindow": "tue:10:28-tue:10:58",
            "StorageEncrypted": false,
            "Engine": "docdb",
            "DBClusterIdentifier": "sample-cluster",
            "DBSubnetGroup": {
                "Subnets": [
                    {
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2a"
                        },
                        "SubnetStatus": "Active",
                        "SubnetIdentifier": "subnet-4e26d263"
                    },
                    {
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2c"
                        },
                        "SubnetStatus": "Active",
                        "SubnetIdentifier": "subnet-afc329f4"
                    },
                    {
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2d"
                        },
                        "SubnetStatus": "Active",
                        "SubnetIdentifier": "subnet-53ab3636"
                    },
                    {
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2b"
                        },
                        "SubnetStatus": "Active",
                        "SubnetIdentifier": "subnet-991cb8d0"
                    }
                ],
                "DBSubnetGroupDescription": "default",
                "SubnetGroupStatus": "Complete",
                "VpcId": "vpc-91280df6",
                "DBSubnetGroupName": "default"
            },
            "DBInstanceClass": "db.r4.xlarge",
            "VpcSecurityGroups": [
                {
                    "Status": "active",
                    "VpcSecurityGroupId": "sg-77186e0d"
                }
            ],
            "DBInstanceArn": "arn:aws:rds:us-west-2:123456789012:db:sample-cluster-instance-2",
            "DbiResourceId": "db-XEKJLEMGRV5ZKCARUVA4HO3ITE"
        }
    }

For more information, see `Adding an Amazon DocumentDB Instance to a Cluster <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-instance-add.html>`__ in the *Amazon DocumentDB Developer Guide*.