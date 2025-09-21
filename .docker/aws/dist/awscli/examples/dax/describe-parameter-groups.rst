**To describe the parameter groups defined in DAX**

The following ``describe-parameter-groups`` example retrieves details about the parameter groups that are defined in DAX. ::

    aws dax describe-parameter-groups

Output::

    {
        "ParameterGroups": [
            {
                "ParameterGroupName": "default.dax1.0",
                "Description": "Default parameter group for dax1.0"
            }
        ]
    }

For more information, see `Managing DAX Clusters <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.cluster-management.html>`__ in the *Amazon DynamoDB Developer Guide*.
