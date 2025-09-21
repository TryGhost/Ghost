**To duplicate an existing DB cluster parameter group**

The following ``copy-db-cluster-parameter-group`` example makes a copy of the parameter group ``custom-docdb3-6`` named ``custom-docdb3-6-copy``. When making the copy it adds tags to the new parameter group. ::

    aws docdb copy-db-cluster-parameter-group \
        --source-db-cluster-parameter-group-identifier custom-docdb3-6 \
        --target-db-cluster-parameter-group-identifier custom-docdb3-6-copy \
        --target-db-cluster-parameter-group-description "Copy of custom-docdb3-6" \
        --tags Key="CopyNumber",Value="1" Key="Modifiable",Value="Yes"

Output::

    {
        "DBClusterParameterGroup": {
            "DBParameterGroupFamily": "docdb3.6",
            "DBClusterParameterGroupArn": "arn:aws:rds:us-east-1:12345678901:cluster-pg:custom-docdb3-6-copy",
            "DBClusterParameterGroupName": "custom-docdb3-6-copy",
            "Description": "Copy of custom-docdb3-6"
        }
    }

For more information, see `Copying an Amazon DocumentDB Cluster Parameter Group <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-cluster-parameter-group-copy.html>`__ in the *Amazon DocumentDB Developer Guide*.
