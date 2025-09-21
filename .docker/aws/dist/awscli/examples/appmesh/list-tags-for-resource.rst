**To list tags for a resource**

The following ``list-tags-for-resource`` example lists all of the tags assigned to the specified resource. ::

    aws appmesh list-tags-for-resource \
        --resource-arn arn:aws:appmesh:us-east-1:123456789012:mesh/app1

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
