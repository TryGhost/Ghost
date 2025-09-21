**To tag a DAX resource**

The following ``tag-resource`` example attaches the specified tag key name and associated value to the specified DAX cluster to describe the cluster usage. ::

    aws dax tag-resource \
        --resource-name arn:aws:dax:us-west-2:123456789012:cache/daxcluster \
        --tags="Key=ClusterUsage,Value=prod"

Output::

    {
        "Tags": [
            {
                "Key": "ClusterUsage",
                "Value": "prod"
            }
        ]
    }

For more information, see `Managing DAX Clusters <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.cluster-management.html#DAX.management.tagging>`__ in the *Amazon DynamoDB Developer Guide*.
