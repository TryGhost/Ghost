**To list tags on a DAX resource**

The following ``list-tags`` example lists the tag keys and values attached to the specified DAX cluster. ::

    aws dax list-tags \
        --resource-name arn:aws:dax:us-west-2:123456789012:cache/daxcluster 

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
