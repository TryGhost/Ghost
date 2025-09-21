**To remove LF-Tag from a resource**

The following ``remove-lf-tags-from-resource`` example removes the LF-Tag association with the table resource. ::

    aws lakeformation remove-lf-tags-from-resource \
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
                "developer"
            ]
        }]
    }

Output::

    {
        "Failures": []
    }

For more information, see `Assigning LF-Tags to Data Catalog resources <https://docs.aws.amazon.com/lake-formation/latest/dg/TBAC-assigning-tags.html>`__ in the *AWS Lake Formation Developer Guide*.
