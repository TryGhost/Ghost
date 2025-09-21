**To restore an Amazon Aurora DB cluster from Amazon S3**

The following ``restore-db-cluster-from-s3`` example restores an Amazon Aurora MySQL version 5.7-compatible DB cluster from a MySQL 5.7 DB backup file in Amazon S3. ::

    aws rds restore-db-cluster-from-s3 \
        --db-cluster-identifier cluster-s3-restore \
        --engine aurora-mysql \
        --master-username admin \
        --master-user-password mypassword \
        --s3-bucket-name amzn-s3-demo-bucket \
        --s3-prefix test-backup \
        --s3-ingestion-role-arn arn:aws:iam::123456789012:role/service-role/TestBackup \
        --source-engine mysql \
        --source-engine-version 5.7.28

Output::

    {
        "DBCluster": {
            "AllocatedStorage": 1,
            "AvailabilityZones": [
                "us-west-2c",
                "us-west-2a",
                "us-west-2b"
            ],
            "BackupRetentionPeriod": 1,
            "DBClusterIdentifier": "cluster-s3-restore",
            "DBClusterParameterGroup": "default.aurora-mysql5.7",
            "DBSubnetGroup": "default",
            "Status": "creating",
            "Endpoint": "cluster-s3-restore.cluster-co3xyzabc123.us-west-2.rds.amazonaws.com",
            "ReaderEndpoint": "cluster-s3-restore.cluster-ro-co3xyzabc123.us-west-2.rds.amazonaws.com",
            "MultiAZ": false,
            "Engine": "aurora-mysql",
            "EngineVersion": "5.7.12",
            "Port": 3306,
            "MasterUsername": "admin",
            "PreferredBackupWindow": "11:15-11:45",
            "PreferredMaintenanceWindow": "thu:12:19-thu:12:49",
            "ReadReplicaIdentifiers": [],
            "DBClusterMembers": [],
            "VpcSecurityGroups": [
                {
                    "VpcSecurityGroupId": "sg-########",
                    "Status": "active"
                }
            ],
            "HostedZoneId": "Z1PVIF0EXAMPLE",
            "StorageEncrypted": false,
            "DbClusterResourceId": "cluster-SU5THYQQHOWCXZZDGXREXAMPLE",
            "DBClusterArn": "arn:aws:rds:us-west-2:123456789012:cluster:cluster-s3-restore",
            "AssociatedRoles": [],
            "IAMDatabaseAuthenticationEnabled": false,
            "ClusterCreateTime": "2020-07-27T14:22:08.095Z",
            "EngineMode": "provisioned",
            "DeletionProtection": false,
            "HttpEndpointEnabled": false,
            "CopyTagsToSnapshot": false,
            "CrossAccountClone": false,
            "DomainMemberships": []
        }
    }

For more information, see `Migrating Data from MySQL by Using an Amazon S3 Bucket <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Migrating.ExtMySQL.html#AuroraMySQL.Migrating.ExtMySQL.S3>`__ in the *Amazon Aurora User Guide*.
