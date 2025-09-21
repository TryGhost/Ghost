**To create a global DB cluster**

The following ``create-global-cluster`` example creates a new Aurora MySQL-compatible global DB cluster. ::

    aws rds create-global-cluster \
        --global-cluster-identifier myglobalcluster \
        --engine aurora-mysql

Output::

    {
        "GlobalCluster": {
            "GlobalClusterIdentifier": "myglobalcluster",
            "GlobalClusterResourceId": "cluster-f0e523bfe07aabb",
            "GlobalClusterArn": "arn:aws:rds::123456789012:global-cluster:myglobalcluster",
            "Status": "available",
            "Engine": "aurora-mysql",
            "EngineVersion": "5.7.mysql_aurora.2.07.2",
            "StorageEncrypted": false,
            "DeletionProtection": false,
            "GlobalClusterMembers": []
        }
    }

For more information, see `Creating an Aurora global database <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-getting-started.html#aurora-global-database-creating>`__ in the *Amazon Aurora User Guide*.