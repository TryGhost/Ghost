**To list tags for a resource**

The following ``list-tags-for-resource`` example lists tags for a resource. ::

    aws elasticache list-tags-for-resource \
        --resource-name "arn:aws:elasticache:us-east-1:123456789012:cluster:my-cluster"

Output::

    {
        "TagList": [
            {
                "Key": "Project",
                "Value": "querySpeedUp"
            },
            {
                "Key": "Environment",
                "Value": "PROD"
            }
        ]
    }

For more information, see `Listing Tags Using the AWS CLI <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Tagging.Managing.CLI.html>`__ in the *Elasticache User Guide*.