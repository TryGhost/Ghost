**To add tags to a resource**

The following ``add-tags-to-resource`` example adds up to 10 tags, key-value pairs, to a cluster or snapshot resource. ::

    aws elasticache add-tags-to-resource \
        --resource-name "arn:aws:elasticache:us-east-1:1234567890:cluster:my-mem-cluster" \
        --tags '{"20150202":15, "ElastiCache":"Service"}'


Output::

    {
        "TagList": [
            {
                "Value": "20150202", 
                "Key": "APIVersion"
            }, 
            {
                "Value": "ElastiCache", 
                "Key": "Service"
            }
        ]
    }

For more information, see `Monitoring Costs with Cost Allocation Tags <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Tagging.html>`__ in the *Elasticache User Guide*.