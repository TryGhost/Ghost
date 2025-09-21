**To describe the parameters in a DB parameter group**

The following ``describe-db-parameters`` example retrieves the details of the specified DB parameter group. ::

    aws rds describe-db-parameters \
        --db-parameter-group-name mydbpg

Output::

    {
        "Parameters": [
            {
                "ParameterName": "allow-suspicious-udfs",
                "Description": "Controls whether user-defined functions that have only an xxx symbol for the main function can be loaded",
                "Source": "engine-default",
                "ApplyType": "static",
                "DataType": "boolean",
                "AllowedValues": "0,1",
                "IsModifiable": false,
                "ApplyMethod": "pending-reboot"
            },
            {
                "ParameterName": "auto_generate_certs",
                "Description": "Controls whether the server autogenerates SSL key and certificate files in the data directory, if they do not already exist.",
                "Source": "engine-default",
                "ApplyType": "static",
                "DataType": "boolean",
                "AllowedValues": "0,1",
                "IsModifiable": false,
                "ApplyMethod": "pending-reboot"
            },
            ...some output truncated...
        ]
    }

For more information, see `Working with DB Parameter Groups <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html>`__ in the *Amazon RDS User Guide*.
