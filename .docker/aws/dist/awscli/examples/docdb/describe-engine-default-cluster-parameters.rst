**To describe the default engine and system parameter information for Amazon DocumentDB**

The following ``describe-engine-default-cluster-parameters`` example displays details for the default engine and system parameter information for the Amazon DocumentDB parameter group ``docdb3.6``. ::

    aws docdb describe-engine-default-cluster-parameters \
        --db-parameter-group-family docdb3.6

Output::

    {
        "EngineDefaults": {
            "DBParameterGroupFamily": "docdb3.6",
            "Parameters": [
                {
                    "ApplyType": "dynamic",
                    "ParameterValue": "disabled",
                    "Description": "Enables auditing on cluster.",
                    "Source": "system",
                    "DataType": "string",
                    "MinimumEngineVersion": "3.6.0",
                    "AllowedValues": "enabled,disabled",
                    "ParameterName": "audit_logs",
                    "IsModifiable": true
                },
                {
                    "ApplyType": "static",
                    "ParameterValue": "enabled",
                    "Description": "Config to enable/disable TLS",
                    "Source": "system",
                    "DataType": "string",
                    "MinimumEngineVersion": "3.6.0",
                    "AllowedValues": "disabled,enabled",
                    "ParameterName": "tls",
                    "IsModifiable": true
                },
                {
                    "ApplyType": "dynamic",
                    "ParameterValue": "enabled",
                    "Description": "Enables TTL Monitoring",
                    "Source": "system",
                    "DataType": "string",
                    "MinimumEngineVersion": "3.6.0",
                    "AllowedValues": "disabled,enabled",
                    "ParameterName": "ttl_monitor",
                    "IsModifiable": true
                }
            ]
        }
    }

For more information, see `DescribeEngineDefaultClusterParameters <https://docs.aws.amazon.com/documentdb/latest/developerguide/API_DescribeEngineDefaultClusterParameters.html>`__ in the *Amazon DocumentDB Developer Guide*.
