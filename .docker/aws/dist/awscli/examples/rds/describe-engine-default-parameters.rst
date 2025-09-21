**To describe the default engine and system parameter information for the database engine**

The following ``describe-engine-default-parameters`` example retrieves details for the default engine and system parameter information for MySQL 5.7 DB instances. ::

    aws rds describe-engine-default-parameters \
        --db-parameter-group-family mysql5.7

Output::

    {
        "EngineDefaults": {
            "Parameters": [
                {
                    "ParameterName": "allow-suspicious-udfs",
                    "Description": "Controls whether user-defined functions that have only an xxx symbol for the main function can be loaded",
                    "Source": "engine-default",
                    "ApplyType": "static",
                    "DataType": "boolean",
                    "AllowedValues": "0,1",
                    "IsModifiable": false
                },
                ...some output truncated...
            ]
        }
    }

For more information, see `Working with DB Parameter Groups <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html>`__ in the *Amazon RDS User Guide*.
