**To delete a parameter group**

The following ``delete-parameter-group`` example deletes a parameter group. ::

    aws memorydb delete-parameter-group \
        --parameter-group-name myRedis6x

Output::

    {
        "ParameterGroup": {
            "Name": "myredis6x",
            "Family": "memorydb_redis6",
            "Description": "my-parameter-group",
            "ARN": "arn:aws:memorydb:us-east-1:491658xxxxxx:parametergroup/myredis6x"
        }
    }

For more information, see `Deleting a parameter group <https://docs.aws.amazon.com/memorydb/latest/devguide/parametergroups.deleting.html>`__ in the *MemoryDB User Guide*.
