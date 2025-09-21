**To reset a parameter group**

The following `reset-parameter-group`` resets a parameter group. ::

    aws memorydb reset-parameter-group \
        --parameter-group-name my-parameter-group \
        --all-parameters

Output::

    {
        "ParameterGroup": {
            "Name": "my-parameter-group",
            "Family": "memorydb_redis6",
            "Description": "my parameter group",
            "ARN": "arn:aws:memorydb:us-east-1:491658xxxxxx:parametergroup/my-parameter-group"
        }
    }

For more information, see `Configuring engine parameters using parameter groups <https://docs.aws.amazon.com/memorydb/latest/devguide/parametergroups.html>`__ in the *MemoryDB User Guide*.
