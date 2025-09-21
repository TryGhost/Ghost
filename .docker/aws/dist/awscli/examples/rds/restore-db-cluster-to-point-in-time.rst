**To restore a DB cluster to a specified time**

The following ``restore-db-cluster-to-point-in-time`` example restores the DB cluster named ``database-4`` to the latest possible time. Using ``copy-on-write`` as the restore type restores the new DB cluster as a clone of the source DB cluster. ::

    aws rds restore-db-cluster-to-point-in-time \
        --source-db-cluster-identifier database-4 \
        --db-cluster-identifier sample-cluster-clone \
        --restore-type copy-on-write \
        --use-latest-restorable-time



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
            "DBClusterIdentifier": "sample-cluster-clone",
            "DBClusterParameterGroup": "default.aurora-postgresql10",
            "DBSubnetGroup": "default",
            "Status": "creating",
            "Endpoint": "sample-cluster-clone.cluster-############.us-west-2.rds.amazonaws.com",
            "ReaderEndpoint": "sample-cluster-clone.cluster-ro-############.us-west-2.rds.amazonaws.com",
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
            "DbClusterResourceId": "cluster-BIZ77GDSA2XBSTNPFW1EXAMPLE",
            "DBClusterArn": "arn:aws:rds:us-west-2:123456789012:cluster:sample-cluster-clone",
            "AssociatedRoles": [],
            "IAMDatabaseAuthenticationEnabled": false,
            "CloneGroupId": "8d19331a-099a-45a4-b4aa-11aa22bb33cc44dd",
            "ClusterCreateTime": "2020-03-10T19:57:38.967Z",
            "EngineMode": "provisioned",
            "DeletionProtection": false,
            "HttpEndpointEnabled": false,
            "CopyTagsToSnapshot": false,
            "CrossAccountClone": false
        }
    }

For more information, see `Restoring a DB Cluster to a Specified Time <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_PIT.html>`__ in the *Amazon Aurora User Guide*.
