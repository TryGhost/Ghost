**To update an ACL**

The following `update-acl`` updates an ACL by adding a user. ::

    aws memorydb untag-resource \
        --resource-arn arn:aws:memorydb:us-east-1:491658xxxxx:cluster/my-cluster \
        --tag-keys mykey

Output::

    {
        "TagList": [
            {
                "Key": "mytag",
                "Value": "myvalue"
            }
        ]
    }

For more information, see `Tagging resources <https://docs.aws.amazon.com/memorydb/latest/devguide/tagging-resources.html>`__ in the *MemoryDB User Guide*.
