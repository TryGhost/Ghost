**To delete an Amazon DocumentDB instance**

The following ``delete-db-instance`` example deletes the Amazon DocumentDB instance ``sample-cluster-instance-2``. ::

    aws docdb delete-db-instance \
        --db-instance-identifier sample-cluster-instance-2

Output::

    {
        "DBInstance": {
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
                "DBSubnetGroupName": "default",
                "DBSubnetGroupDescription": "default",
                "VpcId": "vpc-91280df6",
                "SubnetGroupStatus": "Complete"
            },
            "PreferredBackupWindow": "00:00-00:30",
            "InstanceCreateTime": "2019-03-18T18:37:33.709Z",
            "DBInstanceClass": "db.r4.xlarge",
            "DbiResourceId": "db-XEKJLEMGRV5ZKCARUVA4HO3ITE",
            "BackupRetentionPeriod": 3,
            "Engine": "docdb",
            "VpcSecurityGroups": [
                {
                    "Status": "active",
                    "VpcSecurityGroupId": "sg-77186e0d"
                }
            ],
            "AutoMinorVersionUpgrade": true,
            "PromotionTier": 1,
            "EngineVersion": "3.6.0",
            "Endpoint": {
                "Address": "sample-cluster-instance-2.corcjozrlsfc.us-west-2.docdb.amazonaws.com",
                "HostedZoneId": "ZNKXH85TT8WVW",
                "Port": 27017
            },
            "DBInstanceIdentifier": "sample-cluster-instance-2",
            "PreferredMaintenanceWindow": "tue:10:28-tue:10:58",
            "EnabledCloudwatchLogsExports": [
                "audit"
            ],
            "PendingModifiedValues": {},
            "DBInstanceStatus": "deleting",
            "PubliclyAccessible": false,
            "DBInstanceArn": "arn:aws:rds:us-west-2:123456789012:db:sample-cluster-instance-2",
            "DBClusterIdentifier": "sample-cluster",
            "AvailabilityZone": "us-west-2c",
            "StorageEncrypted": false
        }
    }

For more information, see `Deleting an Amazon DocumentDB Instance <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-instance-delete.html>`__ in the *Amazon DocumentDB Developer Guide*.
