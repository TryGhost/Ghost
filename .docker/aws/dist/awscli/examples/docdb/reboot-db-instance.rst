**To reboot an Amazon DocumentDB instance**

The following ``reboot-db-instance`` example reboots the Amazon DocumentDB instance ``sample-cluster2``. ::

    aws docdb reboot-db-instance \
        --db-instance-identifier sample-cluster2 

This command produces no output.
Output::

    {
        "DBInstance": {
            "PreferredBackupWindow": "18:00-18:30",
            "DBInstanceIdentifier": "sample-cluster2",
            "VpcSecurityGroups": [
                {
                    "Status": "active",
                    "VpcSecurityGroupId": "sg-77186e0d"
                }
            ],
            "DBSubnetGroup": {
                "VpcId": "vpc-91280df6",
                "Subnets": [
                    {
                        "SubnetStatus": "Active",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2a"
                        },
                        "SubnetIdentifier": "subnet-4e26d263"
                    },
                    {
                        "SubnetStatus": "Active",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2c"
                        },
                        "SubnetIdentifier": "subnet-afc329f4"
                    },
                    {
                        "SubnetStatus": "Active",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2d"
                        },
                        "SubnetIdentifier": "subnet-53ab3636"
                    },
                    {
                        "SubnetStatus": "Active",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2b"
                        },
                        "SubnetIdentifier": "subnet-991cb8d0"
                    }
                ],
                "SubnetGroupStatus": "Complete",
                "DBSubnetGroupName": "default",
                "DBSubnetGroupDescription": "default"
            },
            "PendingModifiedValues": {},
            "Endpoint": {
                "Address": "sample-cluster2.corcjozrlsfc.us-west-2.docdb.amazonaws.com",
                "HostedZoneId": "ZNKXH85TT8WVW",
                "Port": 27017
            },
            "EnabledCloudwatchLogsExports": [
                "audit"
            ],
            "StorageEncrypted": false,
            "DbiResourceId": "db-A2GIKUV6KPOHITGGKI2NHVISZA",
            "AutoMinorVersionUpgrade": true,
            "Engine": "docdb",
            "InstanceCreateTime": "2019-03-15T20:36:06.338Z",
            "EngineVersion": "3.6.0",
            "PromotionTier": 5,
            "BackupRetentionPeriod": 7,
            "DBClusterIdentifier": "sample-cluster",
            "PreferredMaintenanceWindow": "mon:08:39-mon:09:09",
            "PubliclyAccessible": false,
            "DBInstanceClass": "db.r4.4xlarge",
            "AvailabilityZone": "us-west-2d",
            "DBInstanceArn": "arn:aws:rds:us-west-2:123456789012:db:sample-cluster2",
            "DBInstanceStatus": "rebooting"
        }
    }

For more information, see `Rebooting an Amazon DocumentDB ILnstance <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-instance-reboot.html>`__ in the *Amazon DocumentDB Developer Guide*.
