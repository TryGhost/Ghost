**Example 1: To reboot a DB shard group**

The following ``reboot-db-shard-group`` example reboots a DB shard group. ::

    aws rds reboot-db-shard-group \
        --db-shard-group-identifier my-db-shard-group

Output::

    {
        "DBShardGroups": [
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

For more information, see `Rebooting an Amazon Aurora DB cluster or Amazon Aurora DB instance <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_RebootCluster.html>`__ in the *Amazon Aurora User Guide*.

**Example 2: To describe your DB shard groups**

The following ``describe-db-shard-groups`` example retrieves the details of your DB shard groups after you run the ``reboot-db-shard-group`` command. The DB shard group ``my-db-shard-group`` is now rebooting. ::

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
                "Status": "rebooting",
                "PubliclyAccessible": false,
                "Endpoint": "my-sv2-cluster.limitless-cekycexample.us-east-2.rds.amazonaws.com"
            }
        ]
    }

For more information, see `Rebooting an Amazon Aurora DB cluster or Amazon Aurora DB instance <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_RebootCluster.html>`__ in the *Amazon Aurora User Guide*.