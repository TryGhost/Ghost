**To describe global DB clusters**

The following ``describe-global-clusters`` example lists Aurora global DB clusters in the current AWS Region. ::

    aws rds describe-global-clusters

Output::

    {
        "GlobalClusters": [
            {
                "GlobalClusterIdentifier": "myglobalcluster",
                "GlobalClusterResourceId": "cluster-f5982077e3b5aabb",
                "GlobalClusterArn": "arn:aws:rds::123456789012:global-cluster:myglobalcluster",
                "Status": "available",
                "Engine": "aurora-mysql",
                "EngineVersion": "5.7.mysql_aurora.2.07.2",
                "StorageEncrypted": false,
                "DeletionProtection": false,
                "GlobalClusterMembers": []
            }
        ]
    }

For more information, see `Managing an Aurora global database <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-managing.html>`__ in the *Amazon Aurora User Guide*.