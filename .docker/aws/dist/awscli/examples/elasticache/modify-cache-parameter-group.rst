**To modify a cache parameter group**

The following ``modify-cache-parameter-group`` example modifies the parameters of the specified cache parameter group. ::

    aws elasticache modify-cache-parameter-group \
        --cache-parameter-group-name "mygroup" \
        --parameter-name-values "ParameterName=activedefrag, ParameterValue=no"

Output::

    {
        "CacheParameterGroupName": "mygroup"
    }

For more information, see `Modifying a Parameter Group <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/ParameterGroups.Modifying.html>`__ in the *Elasticache User Guide*.
