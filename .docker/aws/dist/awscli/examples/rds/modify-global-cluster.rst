**To modify a global DB cluster**

The following ``modify-global-cluster`` example enables deletion protection for an Aurora MySQL-compatible global DB cluster. ::

    aws rds modify-global-cluster \
        --global-cluster-identifier myglobalcluster \
        --deletion-protection

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
            "DeletionProtection": true,
            "GlobalClusterMembers": []
        }
    }

For more information, see `Managing an Aurora global database <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-managing.html>`__ in the *Amazon Aurora User Guide*.