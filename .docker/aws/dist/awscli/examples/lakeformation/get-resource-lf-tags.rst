**To list LF-tags**

The following ``list-lf-tags`` example returns list of LF-tags that the requester has permission to view. ::

    aws lakeformation list-lf-tags \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "CatalogId": "123456789111",
        "ResourceShareType": "ALL",
        "MaxResults": 2
    }

Output::

    {
    "LFTags": [{
            "CatalogId": "123456789111",
            "TagKey": "category",
            "TagValues": [
                "private",
                "public"
            ]
        },
        {
            "CatalogId": "123456789111",
            "TagKey": "group",
            "TagValues": [
                "analyst",
                "campaign",
                "developer"
            ]
        }],
        "NextToken": "kIiwiZXhwaXJhdGlvbiI6eyJzZWNvbmRzIjoxNjYwMDY4dCI6ZmFsc2V9"
    }

For more information, see `Managing LF-Tags for metadata access control <https://docs.aws.amazon.com/lake-formation/latest/dg/managing-tags.html>`__ in the *AWS Lake Formation Developer Guide*.
