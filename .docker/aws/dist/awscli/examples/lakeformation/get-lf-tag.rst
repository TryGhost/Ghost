**To retrieve LF-tag definition**

The following ``get-lf-tag`` example retrieves LF-tag definition. ::

    aws lakeformation get-lf-tag \
        --catalog-id '123456789111' \
        --tag-key 'usergroup' 

Output::

    {
        "CatalogId": "123456789111",
        "TagKey": "usergroup",
        "TagValues": [
            "analyst",
            "campaign",
            "developer"
        ]
    }

For more information, see `Managing LF-Tags for metadata access control <https://docs.aws.amazon.com/lake-formation/latest/dg/managing-tags.html>`__ in the *AWS Lake Formation Developer Guide*.
