**To find information about provisioned Amazon DocumentDB instances**

The following ``describe-db-instances`` example displays details for about the Amazon DocumentDB instance ``sample-cluster-instance``. By omitting the ``--db-instance-identifier`` parameter you get information on up to 100 instances. ::

    aws docdb describe-db-instances \
        --db-instance-identifier sample-cluster-instance

Output::

    {
        "DBInstances": [
            {
                "Endpoint": {
                    "HostedZoneId": "ZNKXH85TT8WVW",
                    "Address": "sample-cluster-instance.corcjozrlsfc.us-west-2.docdb.amazonaws.com",
                    "Port": 27017
                },
                "PreferredBackupWindow": "00:00-00:30",
                "DBInstanceStatus": "available",
                "DBInstanceClass": "db.r4.large",
                "EnabledCloudwatchLogsExports": [
                    "audit"
                ],
                "DBInstanceIdentifier": "sample-cluster-instance",
                "DBSubnetGroup": {
                    "Subnets": [
                        {
                            "SubnetStatus": "Active",
                            "SubnetIdentifier": "subnet-4e26d263",
                            "SubnetAvailabilityZone": {
                                "Name": "us-west-2a"
                            }
                        },
                        {
                            "SubnetStatus": "Active",
                            "SubnetIdentifier": "subnet-afc329f4",
                            "SubnetAvailabilityZone": {
                                "Name": "us-west-2c"
                            }
                        },
                        {
                            "SubnetStatus": "Active",
                            "SubnetIdentifier": "subnet-53ab3636",
                            "SubnetAvailabilityZone": {
                                "Name": "us-west-2d"
                            }
                        },
                        {
                            "SubnetStatus": "Active",
                            "SubnetIdentifier": "subnet-991cb8d0",
                            "SubnetAvailabilityZone": {
                                "Name": "us-west-2b"
                            }
                        }
                    ],
                    "DBSubnetGroupName": "default",
                    "SubnetGroupStatus": "Complete",
                    "DBSubnetGroupDescription": "default",
                    "VpcId": "vpc-91280df6"
                },
                "InstanceCreateTime": "2019-03-15T20:36:06.338Z",
                "Engine": "docdb",
                "StorageEncrypted": false,
                "AutoMinorVersionUpgrade": true,
                "DBInstanceArn": "arn:aws:rds:us-west-2:123456789012:db:sample-cluster-instance",
                "PreferredMaintenanceWindow": "tue:08:39-tue:09:09",
                "VpcSecurityGroups": [
                    {
                        "Status": "active",
                        "VpcSecurityGroupId": "sg-77186e0d"
                    }
                ],
                "DBClusterIdentifier": "sample-cluster",
                "PendingModifiedValues": {},
                "BackupRetentionPeriod": 3,
                "PubliclyAccessible": false,
                "EngineVersion": "3.6.0",
                "PromotionTier": 1,
                "AvailabilityZone": "us-west-2c",
                "DbiResourceId": "db-A2GIKUV6KPOHITGGKI2NHVISZA"
            }
        ]
    }

For more information, see `Describing Amazon DocumentDB Instances <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-instance-view-details.html>`__ in the *Amazon DocumentDB Developer Guide*.
