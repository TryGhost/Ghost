**Example 1: To modify a DB shard group**

The following ``modify-db-shard-group`` example changes the maximum capacity of a DB shard group. ::

    aws rds modify-db-shard-group \
        --db-shard-group-identifier my-db-shard-group \
        --max-acu 1000

Output::

    {
        "DBShardGroups": [
            {
                "DBShardGroupResourceId": "shardgroup-a6e3a0226aa243e2ac6c7a1234567890",
                "DBShardGroupIdentifier": "my-db-shard-group",
                "DBClusterIdentifier": "my-sv2-cluster",
                "MaxACU": 768.0,
                "ComputeRedundancy": 0,
                "Status": "available",
                "PubliclyAccessible": false,
                "Endpoint": "my-sv2-cluster.limitless-cekycexample.us-east-2.rds.amazonaws.com"
            }
        ]
    }

For more information, see `Amazon Aurora DB Clusters <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.html>`__ in the *Amazon Aurora User Guide*.

**Example 2: To describe your DB shard groups**

The following ``describe-db-shard-groups`` example retrieves the details of your DB shard groups after you run the ``modify-db-shard-group`` command. The maximum capacity of the DB shard group ``my-db-shard-group`` is now 1000 Aurora capacity units (ACUs). ::

    aws rds describe-db-shard-groups

Output::

    {
        "DBShardGroups": [
            {
                "DBShardGroupResourceId": "shardgroup-7bb446329da94788b3f957746example",
                "DBShardGroupIdentifier": "limitless-test-shard-grp",
                "DBClusterIdentifier": "limitless-test-cluster",
                "MaxACU": 768.0,
                "ComputeRedundancy": 0,
                "Status": "available",
                "PubliclyAccessible": true,
                "Endpoint": "limitless-test-cluster.limitless-cekycexample.us-east-2.rds.amazonaws.com"
            },
            {
                "DBShardGroupResourceId": "shardgroup-a6e3a0226aa243e2ac6c7a1234567890",
                "DBShardGroupIdentifier": "my-db-shard-group",
                "DBClusterIdentifier": "my-sv2-cluster",
                "MaxACU": 1000.0,
                "ComputeRedundancy": 0,
                "Status": "available",
                "PubliclyAccessible": false,
                "Endpoint": "my-sv2-cluster.limitless-cekycexample.us-east-2.rds.amazonaws.com"
            }
        ]
    }

For more information, see `Amazon Aurora DB Clusters <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.html>`__ in the *Amazon Aurora User Guide*.
