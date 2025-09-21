**To describe your DB parameter group**

The following ``describe-db-parameter-groups`` example retrieves details about your DB parameter groups. ::

    aws rds describe-db-parameter-groups

Output::

    {
        "DBParameterGroups": [
            {
                "DBParameterGroupName": "default.aurora-mysql5.7",
                "DBParameterGroupFamily": "aurora-mysql5.7",
                "Description": "Default parameter group for aurora-mysql5.7",
                "DBParameterGroupArn": "arn:aws:rds:us-east-1:123456789012:pg:default.aurora-mysql5.7"
            },
            {
                "DBParameterGroupName": "default.aurora-postgresql9.6",
                "DBParameterGroupFamily": "aurora-postgresql9.6",
                "Description": "Default parameter group for aurora-postgresql9.6",
                "DBParameterGroupArn": "arn:aws:rds:us-east-1:123456789012:pg:default.aurora-postgresql9.6"
            },
            {
                "DBParameterGroupName": "default.aurora5.6",
                "DBParameterGroupFamily": "aurora5.6",
                "Description": "Default parameter group for aurora5.6",
                "DBParameterGroupArn": "arn:aws:rds:us-east-1:123456789012:pg:default.aurora5.6"
            },
            {
                "DBParameterGroupName": "default.mariadb10.1",
                "DBParameterGroupFamily": "mariadb10.1",
                "Description": "Default parameter group for mariadb10.1",
                "DBParameterGroupArn": "arn:aws:rds:us-east-1:123456789012:pg:default.mariadb10.1"
            },
            ...some output truncated...
        ]
    }

For more information, see `Working with DB Parameter Groups <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html>`__ in the *Amazon RDS User Guide*.
