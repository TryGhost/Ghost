**To describe the default engine and system parameter information for the Aurora database engine**

The following ``describe-engine-default-cluster-parameters`` example retrieves the details of the default engine and system parameter information for Aurora DB clusters with MySQL 5.7 compatibility. ::

    aws rds describe-engine-default-cluster-parameters \
        --db-parameter-group-family aurora-mysql5.7

Output::

    {
        "EngineDefaults": {
            "Parameters": [
                {
                    "ParameterName": "aurora_load_from_s3_role",
                    "Description": "IAM role ARN used to load data from AWS S3",
                    "Source": "engine-default",
                    "ApplyType": "dynamic",
                    "DataType": "string",
                    "IsModifiable": true,
                    "SupportedEngineModes": [
                        "provisioned"
                    ]
                },
                ...some output truncated...
            ]
        }
    }

For more information, see `Working with DB Parameter Groups and DB Cluster Parameter Groups <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_WorkingWithParamGroups.html>`__ in the *Amazon Aurora User Guide*.
