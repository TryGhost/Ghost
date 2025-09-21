**To modify an Amazon DocumentDB DB cluster parameter group**

The following ``modify-db-cluster-parameter-group`` example modifies the Amazon DocumentDB cluster parameter group ``custom3-6-param-grp`` by setting the two parameters ``audit_logs`` and ``ttl_monitor`` to enabled. The changes are applied at the next reboot. ::

    aws docdb modify-db-cluster-parameter-group \
        --db-cluster-parameter-group-name custom3-6-param-grp \
        --parameters ParameterName=audit_logs,ParameterValue=enabled,ApplyMethod=pending-reboot \
                     ParameterName=ttl_monitor,ParameterValue=enabled,ApplyMethod=pending-reboot

Output::

    {
        "DBClusterParameterGroupName": "custom3-6-param-grp"
    }

For more information, see `Modifying an Amazon DocumentDB Cluster Parameter Group <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-cluster-parameter-group-modify.html>`__ in the *Amazon DocumentDB Developer Guide*.
