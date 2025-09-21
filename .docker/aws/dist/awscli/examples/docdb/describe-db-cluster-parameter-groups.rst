**To see the details of one or more Amazon DocumentDB cluster parameter groups**

The following ``describe-db-cluster-parameter-groups`` example displays details for the Amazon DocumentDB cluster parameter group ``custom3-6-param-grp``. ::

    aws docdb describe-db-cluster-parameter-groups \
        --db-cluster-parameter-group-name custom3-6-param-grp

Output::

    {
        "DBClusterParameterGroups": [
            {
                "DBParameterGroupFamily": "docdb3.6",
                "DBClusterParameterGroupArn": "arn:aws:rds:us-east-1:123456789012:cluster-pg:custom3-6-param-grp",
                "Description": "Custom docdb3.6 parameter group",
                "DBClusterParameterGroupName": "custom3-6-param-grp"
            }
        ]
    }

For more information, see `Viewing Amazon DocumentDB Cluster Parameter Groups <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-cluster-parameter-group-describe.html>`__ in the *Amazon DocumentDB Developer Guide*.
