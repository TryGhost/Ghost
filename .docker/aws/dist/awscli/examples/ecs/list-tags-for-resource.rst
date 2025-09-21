**To list the tags for a resource**

The following ``list-tags-for-resource`` example lists the tags for a specific cluster. ::

    aws ecs list-tags-for-resource \
        --resource-arn arn:aws:ecs:us-west-2:123456789012:cluster/MyCluster

Output::

    {
        "tags": [
            {
                "key": "key1",
                "value": "value1"
            },
            {
                "key": "key2",
                "value": "value2"
            },
            {
                "key": "key3",
                "value": "value3"
            }
        ]
    }
