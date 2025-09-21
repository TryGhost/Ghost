**Example 1: To delete a DB shard group unsuccessfully**

The following ``delete-db-shard-group`` example shows the error that occurs when you try to delete a DB shard group before deleting all of your databases and schemas. ::

    aws rds delete-db-shard-group \
        --db-shard-group-identifier limitless-test-shard-grp

Output::

    An error occurred (InvalidDBShardGroupState) when calling the DeleteDBShardGroup operation: Unable to delete the DB shard group limitless-test-db-shard-group.
    Delete all of your Limitless Database databases and schemas, then try again.

**Example 2: To delete a DB shard group successfully**

The following ``delete-db-shard-group`` example deletes a DB shard group after you've deleted all of your databases and schemas, including the ``public`` schema. ::

    aws rds delete-db-shard-group \
        --db-shard-group-identifier limitless-test-shard-grp

Output::

    {
        "DBShardGroupResourceId": "shardgroup-7bb446329da94788b3f957746example",
        "DBShardGroupIdentifier": "limitless-test-shard-grp",
        "DBClusterIdentifier": "limitless-test-cluster",
        "MaxACU": 768.0,
        "ComputeRedundancy": 0,
        "Status": "deleting",
        "PubliclyAccessible": true,
        "Endpoint": "limitless-test-cluster.limitless-cekycexample.us-east-2.rds.amazonaws.com"
    }

For more information, see `Deleting Aurora DB clusters and DB instances <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_DeleteCluster.html>`__ in the *Amazon Aurora User Guide*.