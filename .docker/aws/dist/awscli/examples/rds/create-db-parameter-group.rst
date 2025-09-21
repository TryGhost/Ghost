**To create a DB parameter group**

The following ``create-db-parameter-group`` example creates a DB parameter group. ::

    aws rds create-db-parameter-group \
        --db-parameter-group-name mydbparametergroup \
        --db-parameter-group-family MySQL5.6 \
        --description "My new parameter group"

Output::

    {
        "DBParameterGroup": {
            "DBParameterGroupName": "mydbparametergroup",
            "DBParameterGroupFamily": "mysql5.6",
            "Description": "My new parameter group",
            "DBParameterGroupArn": "arn:aws:rds:us-east-1:123456789012:pg:mydbparametergroup"
        }
    }

For more information, see `Creating a DB Parameter Group <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html#USER_WorkingWithParamGroups.Creating>`__ in the *Amazon RDS User Guide*.
