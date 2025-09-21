**To update a parameter group**

The following update-parameter-group`` updates a parameter group. ::

    aws memorydb update-parameter-group \
        --parameter-group-name my-parameter-group \
        --parameter-name-values "ParameterName=activedefrag, ParameterValue=no"

Output::

    {
        "ParameterGroup": {
            "Name": "my-parameter-group",
            "Family": "memorydb_redis6",
            "Description": "my parameter group",
            "ARN": "arn:aws:memorydb:us-east-1:49165xxxxxx:parametergroup/my-parameter-group"
        }
    }

For more information, see `Modifying a parameter group <https://docs.aws.amazon.com/memorydb/latest/devguide/parametergroups.modifying.html>`__ in the *MemoryDB User Guide*.
