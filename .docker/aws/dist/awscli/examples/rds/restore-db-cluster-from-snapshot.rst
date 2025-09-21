**To restore a DB cluster from a snapshot**

The following ``restore-db-cluster-from-snapshot`` restores an Aurora PostgreSQL DB cluster compatible with PostgreSQL version 10.7 from a DB cluster snapshot named ``test-instance-snapshot``. ::

    aws rds restore-db-cluster-from-snapshot \
        --db-cluster-identifier newdbcluster \
        --snapshot-identifier test-instance-snapshot \
        --engine aurora-postgresql \
        --engine-version 10.7

Output::

    {
        "DBCluster": {
            "AllocatedStorage": 1,
            "AvailabilityZones": [
                "us-west-2c",
                "us-west-2a",
                "us-west-2b"
            ],
            "BackupRetentionPeriod": 7,
            "DatabaseName": "",
            "DBClusterIdentifier": "newdbcluster",
            "DBClusterParameterGroup": "default.aurora-postgresql10",
            "DBSubnetGroup": "default",
            "Status": "creating",
            "Endpoint": "newdbcluster.cluster-############.us-west-2.rds.amazonaws.com",
            "ReaderEndpoint": "newdbcluster.cluster-ro-############.us-west-2.rds.amazonaws.com",
            "MultiAZ": false,
            "Engine": "aurora-postgresql",
            "EngineVersion": "10.7",
            "Port": 5432,
            "MasterUsername": "postgres",
            "PreferredBackupWindow": "09:33-10:03",
            "PreferredMaintenanceWindow": "sun:12:22-sun:12:52",
            "ReadReplicaIdentifiers": [],
            "DBClusterMembers": [],
            "VpcSecurityGroups": [
                {
                    "VpcSecurityGroupId": "sg-########",
                    "Status": "active"
                }
            ],
            "HostedZoneId": "Z1PVIF0EXAMPLE",
            "StorageEncrypted": true,
            "KmsKeyId": "arn:aws:kms:us-west-2:123456789012:key/287364e4-33e3-4755-a3b0-a1b2c3d4e5f6",
            "DbClusterResourceId": "cluster-5DSB5IFQDDUVAWOUWM1EXAMPLE",
            "DBClusterArn": "arn:aws:rds:us-west-2:123456789012:cluster:newdbcluster",
            "AssociatedRoles": [],
            "IAMDatabaseAuthenticationEnabled": false,
            "ClusterCreateTime": "2020-06-05T15:06:58.634Z",
            "EngineMode": "provisioned",
            "DeletionProtection": false,
            "HttpEndpointEnabled": false,
            "CopyTagsToSnapshot": false,
            "CrossAccountClone": false,
            "DomainMemberships": []
        }
    }

For more information, see `Restoring from a DB Cluster Snapshot <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_RestoreFromSnapshot.html>`__ in the *Amazon Aurora User Guide*.
