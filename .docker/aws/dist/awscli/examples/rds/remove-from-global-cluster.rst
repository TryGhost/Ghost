**To detach an Aurora secondary cluster from an Aurora global database cluster**

The following ``remove-from-global-cluster`` example detaches an Aurora secondary cluster from an Aurora global database cluster. The cluster changes from being read-only to a standalone cluster with read-write capability. ::

    aws rds remove-from-global-cluster \
        --region us-west-2 \
        --global-cluster-identifier myglobalcluster \
        --db-cluster-identifier arn:aws:rds:us-west-2:123456789012:cluster:DB-1

Output::

    {
        "GlobalCluster": {
            "GlobalClusterIdentifier": "myglobalcluster",
            "GlobalClusterResourceId": "cluster-abc123def456gh",
            "GlobalClusterArn": "arn:aws:rds::123456789012:global-cluster:myglobalcluster",
            "Status": "available",
            "Engine": "aurora-postgresql",
            "EngineVersion": "10.11",
            "StorageEncrypted": true,
            "DeletionProtection": false,
            "GlobalClusterMembers": [
                {
                    "DBClusterArn": "arn:aws:rds:us-east-1:123456789012:cluster:js-global-cluster",
                    "Readers": [
                        "arn:aws:rds:us-west-2:123456789012:cluster:DB-1"
                    ],
                    "IsWriter": true
                },
                {
                    "DBClusterArn": "arn:aws:rds:us-west-2:123456789012:cluster:DB-1",
                    "Readers": [],
                    "IsWriter": false,
                    "GlobalWriteForwardingStatus": "disabled"
                }
            ]
        }
    }

For more information, see `Removing a cluster from an Amazon Aurora global database <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-managing.html#aurora-global-database-detaching>`__ in the *Amazon Aurora User Guide*.