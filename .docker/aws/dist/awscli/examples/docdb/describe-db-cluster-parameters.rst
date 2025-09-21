**To view the detailed parameter list for an Amazon DocumentDB cluster parameter group.**

The following ``describe-db-cluster-parameters`` example lists the parameters for the Amazon DocumentDB parameter group custom3-6-param-grp. ::

    aws docdb describe-db-cluster-parameters \
         --db-cluster-parameter-group-name custom3-6-param-grp

Output::

    {
        "Parameters": [
            {
                "DataType": "string",
                "ParameterName": "audit_logs",
                "IsModifiable": true,
                "ApplyMethod": "pending-reboot",
                "Source": "system",
                "ApplyType": "dynamic",
                "AllowedValues": "enabled,disabled",
                "Description": "Enables auditing on cluster.",
                "ParameterValue": "disabled"
            },
            {
                "DataType": "string",
                "ParameterName": "tls",
                "IsModifiable": true,
                "ApplyMethod": "pending-reboot",
                "Source": "system",
                "ApplyType": "static",
                "AllowedValues": "disabled,enabled",
                "Description": "Config to enable/disable TLS",
                "ParameterValue": "enabled"
            },
            {
                "DataType": "string",
                "ParameterName": "ttl_monitor",
                "IsModifiable": true,
                "ApplyMethod": "pending-reboot",
                "Source": "user",
                "ApplyType": "dynamic",
                "AllowedValues": "disabled,enabled",
                "Description": "Enables TTL Monitoring",
                "ParameterValue": "enabled"
            }
        ]
    }

For more information, see `Viewing Amazon DocumentDB Cluster Parameters <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-cluster-parameters-describe.html>`__ in the *Amazon DocumentDB Developer Guide*.
