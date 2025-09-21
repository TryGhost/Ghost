**To create a parameter group**

The following `` create-parameter-group`` example creates a parameter group with the specified settings. ::

    aws dax create-parameter-group \
        --parameter-group-name daxparametergroup \
        --description "A new parameter group"

Output::

    {
        "ParameterGroup": {
            "ParameterGroupName": "daxparametergroup",
            "Description": "A new parameter group"
        }
    }

For more information, see `Managing DAX Clusters <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.cluster-management.html#DAX.cluster-management.custom-settings.ttl>`__ in the *Amazon DynamoDB Developer Guide*.
