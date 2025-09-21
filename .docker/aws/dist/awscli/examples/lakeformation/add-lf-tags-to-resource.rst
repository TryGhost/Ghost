**To attach one or more LF-tags to an existing resource**

The following ``add-lf-tags-to-resource`` example attaches given LF-tag to the table resource. ::

    aws lakeformation add-lf-tags-to-resource \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {   
        "CatalogId": "123456789111",
        "Resource": {
            "Table": {
                "CatalogId": "123456789111",
                "DatabaseName": "tpc",
                "Name": "dl_tpc_promotion"
            }
        },
        "LFTags": [{
            "CatalogId": "123456789111",
            "TagKey": "usergroup",
            "TagValues": [
                "analyst"
            ]
        }]
    }

Output::

    {
        "Failures": []
    }

For more information, see `Assigning LF-Tags to Data Catalog resources <https://docs.aws.amazon.com/lake-formation/latest/dg/TBAC-assigning-tags.html>`__ in the *AWS Lake Formation Developer Guide*.
