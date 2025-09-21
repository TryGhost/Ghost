**To list all the tags on an Amazon DocumentDB resource**

The following ``list-tags-for-resource`` example lists all tags on the Amazon DocumentDB cluster ``sample-cluster``. ::

    aws docdb list-tags-for-resource \
        --resource-name arn:aws:rds:us-west-2:123456789012:cluster:sample-cluster

Output::

    {
        "TagList": [
            {
                "Key": "A",
                "Value": "ALPHA"
            },
            {
                "Key": "B",
                "Value": ""
            },
            {
                "Key": "C",
                "Value": "CHARLIE"
            }
        ]
    }

For more information, see `Listing Tags on an Amazon DocumentDB Resource <https://docs.aws.amazon.com/documentdb/latest/developerguide/tagging.html#tagging-list>`__ in the *Amazon DocumentDB Developer Guide*.
