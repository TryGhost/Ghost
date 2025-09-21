**Example 1: To create a MySQL 5.7--compatible DB cluster**

The following ``create-db-cluster`` example creates a MySQL 5.7-compatible DB cluster using the default engine version. Replace the sample password ``secret99`` with a secure password. When you use the console to create a DB cluster, Amazon RDS automatically creates the writer DB instance for your DB cluster. However, when you use the AWS CLI to create a DB cluster, you must explicitly create the writer DB instance for your DB cluster using the ``create-db-instance`` AWS CLI command. ::

    aws rds create-db-cluster \
        --db-cluster-identifier sample-cluster \
        --engine aurora-mysql \
        --engine-version 5.7 \
        --master-username admin \
        --master-user-password secret99 \
        --db-subnet-group-name default \
        --vpc-security-group-ids sg-0b9130572daf3dc16

Output::

    {
        "DBCluster": {
            "DBSubnetGroup": "default",
            "VpcSecurityGroups": [
                {
                    "VpcSecurityGroupId": "sg-0b9130572daf3dc16",
                    "Status": "active"
                }
            ],
            "AllocatedStorage": 1,
            "AssociatedRoles": [],
            "PreferredBackupWindow": "09:12-09:42",
            "ClusterCreateTime": "2023-02-27T23:21:33.048Z",
            "DeletionProtection": false,
            "IAMDatabaseAuthenticationEnabled": false,
            "ReadReplicaIdentifiers": [],
            "EngineMode": "provisioned",
            "Engine": "aurora-mysql",
            "StorageEncrypted": false,
            "MultiAZ": false,
            "PreferredMaintenanceWindow": "mon:04:31-mon:05:01",
            "HttpEndpointEnabled": false,
            "BackupRetentionPeriod": 1,
            "DbClusterResourceId": "cluster-ANPAJ4AE5446DAEXAMPLE",
            "DBClusterIdentifier": "sample-cluster",
            "AvailabilityZones": [
                "us-east-1a",
                "us-east-1b",
                "us-east-1e"
            ],
            "MasterUsername": "master",
            "EngineVersion": "5.7.mysql_aurora.2.11.1",
            "DBClusterArn": "arn:aws:rds:us-east-1:123456789012:cluster:sample-cluster",
            "DBClusterMembers": [],
            "Port": 3306,
            "Status": "creating",
            "Endpoint": "sample-cluster.cluster-cnpexample.us-east-1.rds.amazonaws.com",
            "DBClusterParameterGroup": "default.aurora-mysql5.7",
            "HostedZoneId": "Z2R2ITUGPM61AM",
            "ReaderEndpoint": "sample-cluster.cluster-ro-cnpexample.us-east-1.rds.amazonaws.com",
            "CopyTagsToSnapshot": false
        }
    }

**Example 2: To create a PostgreSQL--compatible DB cluster**

The following ``create-db-cluster`` example creates a PostgreSQL-compatible DB cluster using the default engine version. Replace the example password ``secret99`` with a secure password. When you use the console to create a DB cluster, Amazon RDS automatically creates the writer DB instance for your DB cluster. However, when you use the AWS CLI to create a DB cluster, you must explicitly create the writer DB instance for your DB cluster using the ``create-db-instance`` AWS CLI command. ::

    aws rds create-db-cluster \
        --db-cluster-identifier sample-pg-cluster \
        --engine aurora-postgresql \
        --master-username master \
        --master-user-password secret99 \
        --db-subnet-group-name default \
        --vpc-security-group-ids sg-0b9130572daf3dc16

Output::

    {
        "DBCluster": {
            "Endpoint": "sample-pg-cluster.cluster-cnpexample.us-east-1.rds.amazonaws.com",
            "HttpEndpointEnabled": false,
            "DBClusterMembers": [],
            "EngineMode": "provisioned",
            "CopyTagsToSnapshot": false,
            "HostedZoneId": "Z2R2ITUGPM61AM",
            "IAMDatabaseAuthenticationEnabled": false,
            "AllocatedStorage": 1,
            "VpcSecurityGroups": [
                {
                    "VpcSecurityGroupId": "sg-0b9130572daf3dc16",
                    "Status": "active"
                }
            ],
            "DeletionProtection": false,
            "StorageEncrypted": false,
            "BackupRetentionPeriod": 1,
            "PreferredBackupWindow": "09:56-10:26",
            "ClusterCreateTime": "2023-02-27T23:26:08.371Z",
            "DBClusterParameterGroup": "default.aurora-postgresql13",
            "EngineVersion": "13.7",
            "Engine": "aurora-postgresql",
            "Status": "creating",
            "DBClusterIdentifier": "sample-pg-cluster",
            "MultiAZ": false,
            "Port": 5432,
            "DBClusterArn": "arn:aws:rds:us-east-1:123456789012:cluster:sample-pg-cluster",
            "AssociatedRoles": [],
            "DbClusterResourceId": "cluster-ANPAJ4AE5446DAEXAMPLE",
            "PreferredMaintenanceWindow": "wed:03:33-wed:04:03",
            "ReaderEndpoint": "sample-pg-cluster.cluster-ro-cnpexample.us-east-1.rds.amazonaws.com",
            "MasterUsername": "master",
            "AvailabilityZones": [
                "us-east-1a",
                "us-east-1b",
                "us-east-1c"
            ],
            "ReadReplicaIdentifiers": [],
            "DBSubnetGroup": "default"
        }
    }

For more information, see `Creating an Amazon Aurora DB cluster <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.CreateInstance.html>`__ in the *Amazon Aurora User Guide*.
