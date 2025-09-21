**To reset the specified parameter value to its defaults in an Amazon DocumentDB parameter group**

The following ``reset-db-cluster-parameter-group`` example resets the parameter ``ttl_monitor`` in the Amazon DocumentDB parameter group ``custom3-6-param-grp`` to its default value. ::

    aws docdb reset-db-cluster-parameter-group \
        --db-cluster-parameter-group-name custom3-6-param-grp \
        --parameters ParameterName=ttl_monitor,ApplyMethod=immediate

Output::

    {
        "DBClusterParameterGroupName": "custom3-6-param-grp"
    }

For more information, see `title <link>`__ in the *Amazon DocumentDB Developer Guide*.

**To reset specified or all parameter values to their defaults in an Amazon DocumentDB parameter group**

The following ``reset-db-cluster-parameter-group`` example resets all parameters in the Amazon DocumentDB parameter group ``custom3-6-param-grp`` to their default value. ::

    aws docdb reset-db-cluster-parameter-group \
        --db-cluster-parameter-group-name custom3-6-param-grp \
        --reset-all-parameters

Output::

    {
        "DBClusterParameterGroupName": "custom3-6-param-grp"
    }

For more information, see `Resetting an Amazon DocumentDB Cluster Parameter Group <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-cluster-parameter-group-reset.html>`__ in the *Amazon DocumentDB Developer Guide*.
