**To create an Amazon DocumentDB cluster parameter group**

The following ``create-db-cluster-parameter-group`` example creates the DB cluster parameter group ``sample-parameter-group`` using the ``docdb3.6`` family. ::

    aws docdb create-db-cluster-parameter-group \
        --db-cluster-parameter-group-name sample-parameter-group \
        --db-parameter-group-family docdb3.6 \
        --description "Sample parameter group based on docdb3.6"

Output::

    {
        "DBClusterParameterGroup": {
            "Description": "Sample parameter group based on docdb3.6",
            "DBParameterGroupFamily": "docdb3.6",
            "DBClusterParameterGroupArn": "arn:aws:rds:us-west-2:123456789012:cluster-pg:sample-parameter-group",
            "DBClusterParameterGroupName": "sample-parameter-group"
        }
    }

For more information, see `Creating an Amazon DocumentDB Cluster Parameter Group <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-cluster-parameter-group-create.html>`__ in the *Amazon DocumentDB Developer Guide*.
