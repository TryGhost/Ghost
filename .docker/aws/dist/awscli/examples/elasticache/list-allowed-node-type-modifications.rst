**To list the allowed node modifications**

The following ``list-allowed-node-type-modifications`` example lists all the available node types that you can scale your Redis cluster's or replication group's current node type to. ::

    aws elasticache list-allowed-node-type-modifications \
        --replication-group-id "my-replication-group" 

Output::

    {
        "ScaleUpModifications": [
            "cache.m5.12xlarge",
            "cache.m5.24xlarge",
            "cache.m5.4xlarge",
            "cache.r5.12xlarge",
            "cache.r5.24xlarge",
            "cache.r5.2xlarge",
            "cache.r5.4xlarge"
        ],
        "ScaleDownModifications": [
            "cache.m3.large",
            "cache.m3.medium",
            "cache.m3.xlarge",
            "cache.m4.large",
            "cache.m4.xlarge",
            "cache.m5.2xlarge",
            "cache.m5.large",
            "cache.m5.xlarge",
            "cache.r3.large",
            "cache.r4.large",
            "cache.r4.xlarge",
            "cache.r5.large",
            "cache.t2.medium",
            "cache.t2.micro",
            "cache.t2.small",
            "cache.t3.medium",
            "cache.t3.micro",
            "cache.t3.small"
        ]
    }

For more information, see `Scaling ElastiCache for Redis Clusters <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Scaling.html>`__ in the *Elasticache User Guide*.
