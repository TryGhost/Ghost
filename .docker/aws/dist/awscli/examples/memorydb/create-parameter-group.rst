**To create a parameter group**

The following ``create-parameter-group`` example creates a parameter group. ::

    aws memorydb create-parameter-group \
        --parameter-group-name myRedis6x \
        --family memorydb_redis6 \
        --description "my-parameter-group"

Output::

    {
        "ParameterGroup": {
            "Name": "myredis6x",
            "Family": "memorydb_redis6",
            "Description": "my-parameter-group",
            "ARN": "arn:aws:memorydb:us-east-1:49165xxxxxx:parametergroup/myredis6x"
        }
    }

For more information, see `Creating a parameter group <https://docs.aws.amazon.com/memorydb/latest/devguide/parametergroups.creating.html>`__ in the *MemoryDB User Guide*.
