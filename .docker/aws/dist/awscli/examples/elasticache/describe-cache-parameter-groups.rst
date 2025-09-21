**To describe a cache parameter group**

The following ``describe-cache-parameter-groups`` example returns a list of cache parameter group descriptions. ::

   aws elasticache describe-cache-parameter-groups \
       --cache-parameter-group-name "mygroup"

Output::

    {
        "CacheParameterGroups": [
            {
                "CacheParameterGroupName": "mygroup",
                "CacheParameterGroupFamily": "redis5.0",
                "Description": " "
            }
        ]
    }

For more information, see `Configuring Engine Parameters Using Parameter Groups <https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/ParameterGroups.html>`__ in the *Elasticache User Guide*.

