**To search on database resources by LFTags**

The following ``search-databases-by-lf-tags`` example search on database resources matching LFTag expression. ::

    aws lakeformation search-databases-by-lf-tags \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "MaxResults": 1,
        "CatalogId": "123456789111",
        "Expression": [{
            "TagKey": "usergroup",
            "TagValues": [
                "developer"
            ]
        }]
    }

Output::

    {
        "DatabaseList": [{
            "Database": {
                "CatalogId": "123456789111",
                "Name": "tpc"
            },
            "LFTags": [{
                "CatalogId": "123456789111",
                "TagKey": "usergroup",
                "TagValues": [
                    "developer"
                ]
            }]
        }]
    }

For more information, see `Viewing the resources that a LF-Tag is assigned to <https://docs.aws.amazon.com/lake-formation/latest/dg/TBAC-view-tag-resources.html>`__ in the *AWS Lake Formation Developer Guide*.
