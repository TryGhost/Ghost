**To copy a DB cluster parameter group**

The following ``copy-db-parameter-group`` example makes a copy of a DB parameter group. :: 

    aws rds copy-db-parameter-group \
        --source-db-parameter-group-identifier mydbpg \
        --target-db-parameter-group-identifier mydbpgcopy \
        --target-db-parameter-group-description "Copy of mydbpg parameter group"

Output::

    {
        "DBParameterGroup": {
            "DBParameterGroupName": "mydbpgcopy",
            "DBParameterGroupArn": "arn:aws:rds:us-east-1:814387698303:pg:mydbpgcopy",
            "DBParameterGroupFamily": "mysql5.7",
            "Description": "Copy of mydbpg parameter group"
        }
    }

For more information, see `Copying a DB Parameter Group <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html#USER_WorkingWithParamGroups.Copying>`__ in the *Amazon RDS Users Guide*.
