**To search on table resources by LFTags**

The following ``search-tables-by-lf-tags`` example search on table resources matching LFTag expression. ::

    aws lakeformation search-tables-by-lf-tags \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "MaxResults": 2,
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
        "NextToken": "c2VhcmNoQWxsVGFnc0luVGFibGVzIjpmYWxzZX0=",
        "TableList": [{
            "Table": {
                "CatalogId": "123456789111",
                "DatabaseName": "tpc",
                "Name": "dl_tpc_item"
            },
            "LFTagOnDatabase": [{
                "CatalogId": "123456789111",
                "TagKey": "usergroup",
                "TagValues": [
                    "developer"
                ]
            }],
            "LFTagsOnTable": [{
                "CatalogId": "123456789111",
                "TagKey": "usergroup",
                "TagValues": [
                    "developer"
                ]
            }],
            "LFTagsOnColumns": [{
                    "Name": "i_item_desc",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_container",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_wholesale_cost",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_manufact_id",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_brand_id",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_formulation",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_current_price",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_size",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_rec_start_date",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_manufact",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_item_sk",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_manager_id",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_item_id",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_class_id",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_class",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_category",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_category_id",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_brand",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_units",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_rec_end_date",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_color",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                },
                {
                    "Name": "i_product_name",
                    "LFTags": [{
                        "CatalogId": "123456789111",
                        "TagKey": "usergroup",
                        "TagValues": [
                            "developer"
                        ]
                    }]
                }
            ]
        }]
    }

For more information, see `Viewing the resources that a LF-Tag is assigned to <https://docs.aws.amazon.com/lake-formation/latest/dg/TBAC-view-tag-resources.html>`__ in the *AWS Lake Formation Developer Guide*.
