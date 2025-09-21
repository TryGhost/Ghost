**To modify a DB parameter group**

The following ``modify-db-parameter-group`` example changes the value of the ``clr enabled`` parameter in a DB parameter group. The ``--apply-immediately`` parameter causes the DB parameter group to be modified immediately, instead of waiting until the next maintenance window. ::

    aws rds modify-db-parameter-group \
        --db-parameter-group-name test-sqlserver-se-2017 \
        --parameters "ParameterName='clr enabled',ParameterValue=1,ApplyMethod=immediate"


Output::

    {
        "DBParameterGroupName": "test-sqlserver-se-2017"
    }

For more information, see `Modifying Parameters in a DB Parameter Group <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html#USER_WorkingWithParamGroups.Modifying>`__ in the *Amazon RDS User Guide*.
