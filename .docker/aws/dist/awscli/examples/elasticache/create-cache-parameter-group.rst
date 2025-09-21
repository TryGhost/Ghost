**To create a cache parameter group**

The following ``create-cache-parameter-group`` example creates a new Amazon ElastiCache cache parameter group. ::

    aws elasticache create-cache-parameter-group \
        --cache-parameter-group-family "redis5.0" \
        --cache-parameter-group-name "mygroup" \
        --description "mygroup"

Output::

    {
        "CacheParameterGroup": {
            "CacheParameterGroupName": "mygroup",
            "CacheParameterGroupFamily": "redis5.0",
            "Description": "my group"
        }
    }

For more information, see `Creating a Parameter Group <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/ParameterGroups.Creating.html>`__ in the *Elasticache User Guide*.
