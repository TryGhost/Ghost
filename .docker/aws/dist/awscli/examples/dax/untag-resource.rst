**To remove tags from a DAX resource**

The following ``untag-resource`` example removes the tag with the specified key name from a DAX cluster. ::

    aws dax untag-resource  \
        --resource-name arn:aws:dax:us-west-2:123456789012:cache/daxcluster \
        --tag-keys="ClusterUsage"

Output::

    {
        "Tags": []
    }

For more information, see `Managing DAX Clusters <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.cluster-management.html#DAX.management.tagging>`__ in the *Amazon DynamoDB Developer Guide*.
