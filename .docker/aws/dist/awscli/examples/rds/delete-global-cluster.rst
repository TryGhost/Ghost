**To delete a global DB cluster**

The following ``delete-global-cluster`` example deletes an Aurora MySQL-compatible global DB cluster. The output shows the cluster that you're deleting, but subsequent ``describe-global-clusters`` commands don't list that DB cluster. ::

    aws rds delete-global-cluster \
        --global-cluster-identifier myglobalcluster

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

For more information, see `Deleting an Aurora global database <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-managing.html#aurora-global-database-deleting>`__ in the *Amazon Aurora User Guide*.