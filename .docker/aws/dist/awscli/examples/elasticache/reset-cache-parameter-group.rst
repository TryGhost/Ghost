**To reset a cache parameter group**

The following ``reset-cache-parameter-group`` example modifies the parameters of a cache parameter group to the engine or system default value. You can reset specific parameters by submitting a list of parameter names. To reset the entire cache parameter group, specify the ``--reset-all-parameters`` and ``--cache-parameter-group-name`` parameters. ::

    aws elasticache reset-cache-parameter-group \
        --cache-parameter-group-name "mygroup" \
        --reset-all-parameters

Output::

    {
        "CacheParameterGroupName": "mygroup"
    }
