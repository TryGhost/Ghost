**To return the default system parameter information for DAX**

The following ``describe-default-parameters`` example displays the default system parameter information for DAX. ::

    aws dax describe-default-parameters

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
