**To describe the parameters defined in a DAX parameter group**

The following ``describe-parameters`` example retrieves details about the parameters that are defined in the specified DAX parameter group. ::

    aws dax describe-parameters \
        --parameter-group-name default.dax1.0

Output::

    {
        "Parameters": [
            {
                "ParameterName": "query-ttl-millis",
                "ParameterType": "DEFAULT",
                "ParameterValue": "300000",
                "NodeTypeSpecificValues": [],
                "Description": "Duration in milliseconds for queries to remain cached",
                "Source": "user",
                "DataType": "integer",
                "AllowedValues": "0-",
                "IsModifiable": "TRUE",
                "ChangeType": "IMMEDIATE"
            },
            {
                "ParameterName": "record-ttl-millis",
                "ParameterType": "DEFAULT",
                "ParameterValue": "300000",
                "NodeTypeSpecificValues": [],
                "Description": "Duration in milliseconds for records to remain valid in cache (Default: 0 = infinite)",
                "Source": "user",
                "DataType": "integer",
                "AllowedValues": "0-",
                "IsModifiable": "TRUE",
                "ChangeType": "IMMEDIATE"
            }
        ]
    }

For more information, see `Managing DAX Clusters <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.cluster-management.html>`__ in the *Amazon DynamoDB Developer Guide*.
