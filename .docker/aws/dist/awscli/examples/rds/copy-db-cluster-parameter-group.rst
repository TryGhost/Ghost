**To copy a DB cluster parameter group**

The following ``copy-db-cluster-parameter-group`` example makes a copy of a DB cluster parameter group. :: 

    aws rds copy-db-cluster-parameter-group \
        --source-db-cluster-parameter-group-identifier mydbclusterpg \
        --target-db-cluster-parameter-group-identifier mydbclusterpgcopy \
        --target-db-cluster-parameter-group-description "Copy of mydbclusterpg parameter group"

Output::

    {
        "DBClusterParameterGroup": {
            "DBClusterParameterGroupName": "mydbclusterpgcopy",
            "DBClusterParameterGroupArn": "arn:aws:rds:us-east-1:123456789012:cluster-pg:mydbclusterpgcopy",
            "DBParameterGroupFamily": "aurora-mysql5.7",
            "Description": "Copy of mydbclusterpg parameter group"
        }
    }

For more information, see `Copying a DB Cluster Parameter Group <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_WorkingWithParamGroups.html#USER_WorkingWithParamGroups.CopyingCluster>`__ in the *Amazon Aurora Users Guide*.
