**To create a DB cluster parameter group**

The following ``create-db-cluster-parameter-group`` example creates a DB cluster parameter group. ::

    aws rds create-db-cluster-parameter-group \
        --db-cluster-parameter-group-name mydbclusterparametergroup \
        --db-parameter-group-family aurora5.6 \
        --description "My new cluster parameter group"

Output::

    {
        "DBClusterParameterGroup": {
            "DBClusterParameterGroupName": "mydbclusterparametergroup",
            "DBParameterGroupFamily": "aurora5.6",
            "Description": "My new cluster parameter group",
            "DBClusterParameterGroupArn": "arn:aws:rds:us-east-1:123456789012:cluster-pg:mydbclusterparametergroup"
        }
    }

For more information, see `Creating a DB Cluster Parameter Group <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_WorkingWithParamGroups.html#USER_WorkingWithParamGroups.CreatingCluster>`__ in the *Amazon Aurora User Guide*.
