**Example 1: To create an Aurora PostgreSQL primary DB cluster**

The following ``create-db-cluster`` example creates an Aurora PostgreSQL SQL primary DB cluster that's compatible with Aurora Serverless v2 and Aurora Limitless Database. ::

    aws rds create-db-cluster \
        --db-cluster-identifier my-sv2-cluster \
        --engine aurora-postgresql \
        --engine-version 15.2-limitless \
        --storage-type aurora-iopt1 \
        --serverless-v2-scaling-configuration MinCapacity=2,MaxCapacity=16 \
        --enable-limitless-database \
        --master-username myuser \
        --master-user-password mypassword \
        --enable-cloudwatch-logs-exports postgresql

Output::

    {
        "DBCluster": {
            "AllocatedStorage": 1,
            "AvailabilityZones": [
                "us-east-2b",
                "us-east-2c",
                "us-east-2a"
            ],
            "BackupRetentionPeriod": 1,
            "DBClusterIdentifier": "my-sv2-cluster",
            "DBClusterParameterGroup": "default.aurora-postgresql15",
            "DBSubnetGroup": "default",
            "Status": "creating",
            "Endpoint": "my-sv2-cluster.cluster-cekycexample.us-east-2.rds.amazonaws.com",
            "ReaderEndpoint": "my-sv2-cluster.cluster-ro-cekycexample.us-east-2.rds.amazonaws.com",
            "MultiAZ": false,
            "Engine": "aurora-postgresql",
            "EngineVersion": "15.2-limitless",
            "Port": 5432,
            "MasterUsername": "myuser",
            "PreferredBackupWindow": "06:05-06:35",
            "PreferredMaintenanceWindow": "mon:08:25-mon:08:55",
            "ReadReplicaIdentifiers": [],
            "DBClusterMembers": [],
            "VpcSecurityGroups": [
                {
                    "VpcSecurityGroupId": "sg-########",
                    "Status": "active"
                }
            ],
            "HostedZoneId": "Z2XHWR1EXAMPLE",
            "StorageEncrypted": false,
            "DbClusterResourceId": "cluster-XYEDT6ML6FHIXH4Q2J1EXAMPLE",
            "DBClusterArn": "arn:aws:rds:us-east-2:123456789012:cluster:my-sv2-cluster",
            "AssociatedRoles": [],
            "IAMDatabaseAuthenticationEnabled": false,
            "ClusterCreateTime": "2024-02-19T16:24:07.771000+00:00",
            "EnabledCloudwatchLogsExports": [
                "postgresql"
            ],
            "EngineMode": "provisioned",
            "DeletionProtection": false,
            "HttpEndpointEnabled": false,
            "CopyTagsToSnapshot": false,
            "CrossAccountClone": false,
            "DomainMemberships": [],
            "TagList": [],
            "StorageType": "aurora-iopt1",
            "AutoMinorVersionUpgrade": true,
            "ServerlessV2ScalingConfiguration": {
                "MinCapacity": 2.0,
                "MaxCapacity": 16.0
            },
            "NetworkType": "IPV4",
            "IOOptimizedNextAllowedModificationTime": "2024-03-21T16:24:07.781000+00:00",
            "LimitlessDatabase": {
                "Status": "not-in-use",
                "MinRequiredACU": 96.0
            }
        }
    }

**Example 2: To create the primary (writer) DB instance**

The following ``create-db-instance`` example creates an Aurora Serverless v2 primary (writer) DB instance. When you use the console to create a DB cluster, Amazon RDS automatically creates the writer DB instance for your DB cluster. However, when you use the AWS CLI to create a DB cluster, you must explicitly create the writer DB instance for your DB cluster using the ``create-db-instance`` AWS CLI command. ::

    aws rds create-db-instance \
        --db-instance-identifier my-sv2-instance \
        --db-cluster-identifier my-sv2-cluster \
        --engine aurora-postgresql \
        --db-instance-class db.serverless

Output::

    {
        "DBInstance": {
            "DBInstanceIdentifier": "my-sv2-instance",
            "DBInstanceClass": "db.serverless",
            "Engine": "aurora-postgresql",
            "DBInstanceStatus": "creating",
            "MasterUsername": "myuser",
            "AllocatedStorage": 1,
            "PreferredBackupWindow": "06:05-06:35",
            "BackupRetentionPeriod": 1,
            "DBSecurityGroups": [],
            "VpcSecurityGroups": [
                {
                    "VpcSecurityGroupId": "sg-########",
                    "Status": "active"
                }
            ],
            "DBParameterGroups": [
                {
                    "DBParameterGroupName": "default.aurora-postgresql15",
                    "ParameterApplyStatus": "in-sync"
                }
            ],
            "DBSubnetGroup": {
                "DBSubnetGroupName": "default",
                "DBSubnetGroupDescription": "default",
                "VpcId": "vpc-########",
                "SubnetGroupStatus": "Complete",
                "Subnets": [
                    {
                        "SubnetIdentifier": "subnet-########",
                        "SubnetAvailabilityZone": {
                            "Name": "us-east-2c"
                        },
                        "SubnetOutpost": {},
                        "SubnetStatus": "Active"
                    },
                    {
                        "SubnetIdentifier": "subnet-########",
                        "SubnetAvailabilityZone": {
                            "Name": "us-east-2a"
                        },
                        "SubnetOutpost": {},
                        "SubnetStatus": "Active"
                    },
                    {
                        "SubnetIdentifier": "subnet-########",
                        "SubnetAvailabilityZone": {
                            "Name": "us-east-2b"
                        },
                        "SubnetOutpost": {},
                        "SubnetStatus": "Active"
                    }
                ]
            },
            "PreferredMaintenanceWindow": "fri:09:01-fri:09:31",
            "PendingModifiedValues": {
                "PendingCloudwatchLogsExports": {
                    "LogTypesToEnable": [
                        "postgresql"
                    ]
                }
            },
            "MultiAZ": false,
            "EngineVersion": "15.2-limitless",
            "AutoMinorVersionUpgrade": true,
            "ReadReplicaDBInstanceIdentifiers": [],
            "LicenseModel": "postgresql-license",
            "OptionGroupMemberships": [
                {
                    "OptionGroupName": "default:aurora-postgresql-15",
                    "Status": "in-sync"
                }
            ],
            "PubliclyAccessible": false,
            "StorageType": "aurora-iopt1",
            "DbInstancePort": 0,
            "DBClusterIdentifier": "my-sv2-cluster",
            "StorageEncrypted": false,
            "DbiResourceId": "db-BIQTE3B3K3RM7M74SK5EXAMPLE",
            "CACertificateIdentifier": "rds-ca-rsa2048-g1",
            "DomainMemberships": [],
            "CopyTagsToSnapshot": false,
            "MonitoringInterval": 0,
            "PromotionTier": 1,
            "DBInstanceArn": "arn:aws:rds:us-east-2:123456789012:db:my-sv2-instance",
            "IAMDatabaseAuthenticationEnabled": false,
            "PerformanceInsightsEnabled": false,
            "DeletionProtection": false,
            "AssociatedRoles": [],
            "TagList": [],
            "CustomerOwnedIpEnabled": false,
            "BackupTarget": "region",
            "NetworkType": "IPV4",
            "StorageThroughput": 0,
            "CertificateDetails": {
                "CAIdentifier": "rds-ca-rsa2048-g1"
            },
            "DedicatedLogVolume": false
        }
    }

**Example 3: To create the DB shard group**

The following ``create-db-shard-group`` example creates a DB shard group in your Aurora PostgreSQL primary DB cluster. ::

    aws rds create-db-shard-group \
        --db-shard-group-identifier my-db-shard-group \
        --db-cluster-identifier my-sv2-cluster \
        --max-acu 768

Output::

    {
        "DBShardGroupResourceId": "shardgroup-a6e3a0226aa243e2ac6c7a1234567890",
        "DBShardGroupIdentifier": "my-db-shard-group",
        "DBClusterIdentifier": "my-sv2-cluster",
        "MaxACU": 768.0,
        "ComputeRedundancy": 0,
        "Status": "creating",
        "PubliclyAccessible": false,
        "Endpoint": "my-sv2-cluster.limitless-cekycexample.us-east-2.rds.amazonaws.com"
    }

For more information, see `Using Aurora Serverless v2 <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html>`__ in the *Amazon Aurora User Guide*.