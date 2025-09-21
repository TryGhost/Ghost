**To modify parameters in a DB cluster parameter group**

The following ``modify-db-cluster-parameter-group`` example modifies the values of parameters in a DB cluster parameter group. ::

    aws rds modify-db-cluster-parameter-group \
        --db-cluster-parameter-group-name mydbclusterpg \
        --parameters "ParameterName=server_audit_logging,ParameterValue=1,ApplyMethod=immediate" \
                     "ParameterName=server_audit_logs_upload,ParameterValue=1,ApplyMethod=immediate"

Output::

    {
        "DBClusterParameterGroupName": "mydbclusterpg"
    }

For more information, see `Working with DB parameter groups and DB cluster parameter groups <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_WorkingWithParamGroups.html>`__ in the *Amazon Aurora User Guide*.