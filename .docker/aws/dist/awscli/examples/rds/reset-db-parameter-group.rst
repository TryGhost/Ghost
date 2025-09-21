**Example 1: To reset all parameters to their default values**

The following ``reset-db-parameter-group`` example resets all parameter values in a customer-created DB parameter group to their default values. ::

    aws rds reset-db-parameter-group \
        --db-parameter-group-name mypg \
        --reset-all-parameters

Output::

    {
        "DBParameterGroupName": "mypg"
    }

For more information, see `Working with DB parameter groups <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html>`__ in the *Amazon RDS User Guide* and `Working with DB parameter groups and DB cluster parameter groups <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_WorkingWithParamGroups.html>`__ in the *Amazon Aurora User Guide*.

**Example 2: To reset specific parameters to their default values**

The following ``reset-db-parameter-group`` example resets the parameter values for specific parameters to their default values in a customer-created DB parameter group. ::

    aws rds reset-db-parameter-group \
        --db-parameter-group-name mypg \
        --parameters "ParameterName=max_connections,ApplyMethod=immediate" \
                     "ParameterName=max_allowed_packet,ApplyMethod=immediate"

Output::

    {
        "DBParameterGroupName": "mypg"
    }

For more information, see `Working with DB parameter groups <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html>`__ in the *Amazon RDS User Guide* and `Working with DB parameter groups and DB cluster parameter groups <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_WorkingWithParamGroups.html>`__ in the *Amazon Aurora User Guide*.