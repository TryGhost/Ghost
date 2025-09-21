**Example 1: To describe the parameters in a DB cluster parameter group**

The following ``describe-db-cluster-parameters`` example retrieves details about the parameters in a DB cluster parameter group. ::

    aws rds describe-db-cluster-parameters \
        --db-cluster-parameter-group-name mydbclusterpg

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
                "ApplyMethod": "pending-reboot",
                "SupportedEngineModes": [
                    "provisioned"
                ]
            },
            {
                "ParameterName": "aurora_lab_mode",
                "ParameterValue": "0",
                "Description": "Enables new features in the Aurora engine.",
                "Source": "engine-default",
                "ApplyType": "static",
                "DataType": "boolean",
                "AllowedValues": "0,1",
                "IsModifiable": true,
                "ApplyMethod": "pending-reboot",
                "SupportedEngineModes": [
                    "provisioned"
                ]
            },
            ...some output truncated...
        ]
    }

**Example 2: To list only the parameter names in a DB cluster parameter group**

The following ``describe-db-cluster-parameters`` example retrieves only the names of the parameters in a DB cluster parameter group. ::

    aws rds describe-db-cluster-parameters \
        --db-cluster-parameter-group-name default.aurora-mysql5.7 \
        --query 'Parameters[].{ParameterName:ParameterName}'

Output::

    [
        {
            "ParameterName": "allow-suspicious-udfs"
        }, 
        {
            "ParameterName": "aurora_binlog_read_buffer_size"
        }, 
        {
            "ParameterName": "aurora_binlog_replication_max_yield_seconds"
        }, 
        {
            "ParameterName": "aurora_binlog_use_large_read_buffer"
        }, 
        {
            "ParameterName": "aurora_lab_mode"
        }, 

        ...some output truncated...
        }
    ]

**Example 3: To describe only the modifiable parameters in a DB cluster parameter group**

The following ``describe-db-cluster-parameters`` example retrieves the names of only the parameters that you can modify in a DB cluster parameter group. ::

    aws rds describe-db-cluster-parameters \
        --db-cluster-parameter-group-name default.aurora-mysql5.7 \
        --query 'Parameters[].{ParameterName:ParameterName,IsModifiable:IsModifiable} | [?IsModifiable == `true`]'

Output::

    [
        {
            "ParameterName": "aurora_binlog_read_buffer_size", 
            "IsModifiable": true
        }, 
        {
            "ParameterName": "aurora_binlog_replication_max_yield_seconds", 
            "IsModifiable": true
        }, 
        {
            "ParameterName": "aurora_binlog_use_large_read_buffer", 
            "IsModifiable": true
        }, 
        {
            "ParameterName": "aurora_lab_mode", 
            "IsModifiable": true
        }, 

        ...some output truncated...
        }
    ]

**Example 4: To describe only the modifable Boolean parameters in a DB cluster parameter group**

The following ``describe-db-cluster-parameters`` example retrieves the names of only the parameters that you can modify in a DB cluster parameter group and that have a Boolean data type. ::

    aws rds describe-db-cluster-parameters \
        --db-cluster-parameter-group-name default.aurora-mysql5.7 \
        --query 'Parameters[].{ParameterName:ParameterName,DataType:DataType,IsModifiable:IsModifiable} | [?DataType == `boolean`] | [?IsModifiable == `true`]'

Output::

    [
        {
            "DataType": "boolean", 
            "ParameterName": "aurora_binlog_use_large_read_buffer", 
            "IsModifiable": true
        }, 
        {
            "DataType": "boolean", 
            "ParameterName": "aurora_lab_mode", 
            "IsModifiable": true
        }, 
        {
            "DataType": "boolean", 
            "ParameterName": "autocommit", 
            "IsModifiable": true
        }, 
        {
            "DataType": "boolean", 
            "ParameterName": "automatic_sp_privileges", 
            "IsModifiable": true
        }, 
        ...some output truncated...
        }
    ]

For more information, see `Working with DB Parameter Groups and DB Cluster Parameter Groups <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_WorkingWithParamGroups.html>`__ in the *Amazon Aurora User Guide*.
