**Example 1: To describe a DB cluster**

The following ``describe-db-clusters`` example retrieves the details of the specified DB cluster. ::

    aws rds describe-db-clusters \
        --db-cluster-identifier mydbcluster

Output::

    {
        "DBClusters": [
            {
                "AllocatedStorage": 1,
                "AvailabilityZones": [
                    "us-east-1a",
                    "us-east-1b",
                    "us-east-1e"
                ],
                "BackupRetentionPeriod": 1,
                "DatabaseName": "mydbcluster",
                "DBClusterIdentifier": "mydbcluster",
                "DBClusterParameterGroup": "default.aurora-mysql5.7",
                "DBSubnetGroup": "default",
                "Status": "available",
                "EarliestRestorableTime": "2019-06-19T09:16:28.210Z",
                "Endpoint": "mydbcluster.cluster-cnpexample.us-east-1.rds.amazonaws.com",
                "ReaderEndpoint": "mydbcluster.cluster-ro-cnpexample.us-east-1.rds.amazonaws.com",
                "MultiAZ": true,
                "Engine": "aurora-mysql",
                "EngineVersion": "5.7.mysql_aurora.2.04.2",
                "LatestRestorableTime": "2019-06-20T22:38:14.908Z",
                "Port": 3306,
                "MasterUsername": "myadmin",
                "PreferredBackupWindow": "09:09-09:39",
                "PreferredMaintenanceWindow": "sat:04:09-sat:04:39",
                "ReadReplicaIdentifiers": [],
                "DBClusterMembers": [
                    {
                        "DBInstanceIdentifier": "dbinstance3",
                        "IsClusterWriter": false,
                        "DBClusterParameterGroupStatus": "in-sync",
                        "PromotionTier": 1
                    },
                    {
                        "DBInstanceIdentifier": "dbinstance1",
                        "IsClusterWriter": false,
                        "DBClusterParameterGroupStatus": "in-sync",
                        "PromotionTier": 1
                    },
                    {
                        "DBInstanceIdentifier": "dbinstance2",
                        "IsClusterWriter": false,
                        "DBClusterParameterGroupStatus": "in-sync",
                        "PromotionTier": 1
                    },
                    {
                        "DBInstanceIdentifier": "mydbcluster",
                        "IsClusterWriter": false,
                        "DBClusterParameterGroupStatus": "in-sync",
                        "PromotionTier": 1
                    },
                    {
                        "DBInstanceIdentifier": "mydbcluster-us-east-1b",
                        "IsClusterWriter": false,
                        "DBClusterParameterGroupStatus": "in-sync",
                        "PromotionTier": 1
                    },
                    {
                        "DBInstanceIdentifier": "mydbcluster",
                        "IsClusterWriter": true,
                        "DBClusterParameterGroupStatus": "in-sync",
                        "PromotionTier": 1
                    }
                ],
                "VpcSecurityGroups": [
                    {
                        "VpcSecurityGroupId": "sg-0b9130572daf3dc16",
                        "Status": "active"
                    }
                ],
                "HostedZoneId": "Z2R2ITUGPM61AM",
                "StorageEncrypted": true,
                "KmsKeyId": "arn:aws:kms:us-east-1:814387698303:key/AKIAIOSFODNN7EXAMPLE",
                "DbClusterResourceId": "cluster-AKIAIOSFODNN7EXAMPLE",
                "DBClusterArn": "arn:aws:rds:us-east-1:123456789012:cluster:mydbcluster",
                "AssociatedRoles": [],
                "IAMDatabaseAuthenticationEnabled": false,
                "ClusterCreateTime": "2019-04-15T14:18:42.785Z",
                "EngineMode": "provisioned",
                "DeletionProtection": false,
                "HttpEndpointEnabled": false
            }
        ]
    }

**Example 2: To list certain attributes of all DB clusters**

The following ``describe-db-clusters`` example retrieves only the ``DBClusterIdentifier``, ``Endpoint``, and ``ReaderEndpoint`` attributes of all your DB clusters in the current AWS Region. ::

    aws rds describe-db-clusters \
        --query 'DBClusters[].{DBClusterIdentifier:DBClusterIdentifier,Endpoint:Endpoint,ReaderEndpoint:ReaderEndpoint}'

Output::

    [
        {
            "Endpoint": "cluster-57-2020-05-01-2270.cluster-cnpexample.us-east-1.rds.amazonaws.com",
            "ReaderEndpoint": "cluster-57-2020-05-01-2270.cluster-ro-cnpexample.us-east-1.rds.amazonaws.com",
            "DBClusterIdentifier": "cluster-57-2020-05-01-2270"
        },
        {
            "Endpoint": "cluster-57-2020-05-01-4615.cluster-cnpexample.us-east-1.rds.amazonaws.com",
            "ReaderEndpoint": "cluster-57-2020-05-01-4615.cluster-ro-cnpexample.us-east-1.rds.amazonaws.com",
            "DBClusterIdentifier": "cluster-57-2020-05-01-4615"
        },
        {
            "Endpoint": "pg2-cluster.cluster-cnpexample.us-east-1.rds.amazonaws.com",
            "ReaderEndpoint": "pg2-cluster.cluster-ro-cnpexample.us-east-1.rds.amazonaws.com",
            "DBClusterIdentifier": "pg2-cluster"
        },
        ...output omitted...
        }
    ]

**Example 3: To list DB clusters with a specific attribute**

The following ``describe-db-clusters`` example retrieves only the ``DBClusterIdentifier`` and ``Engine`` attributes of your DB clusters that use the ``aurora-postgresql`` DB engine. ::

    aws rds describe-db-clusters \
        --query 'DBClusters[].{DBClusterIdentifier:DBClusterIdentifier,Engine:Engine} | [?Engine == `aurora-postgresql`]'

Output::

    [
        {
            "Engine": "aurora-postgresql",
            "DBClusterIdentifier": "pg2-cluster"
        }
    ]

For more information, see `Amazon Aurora DB Clusters <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.html>`__ in the *Amazon Aurora User Guide*.
