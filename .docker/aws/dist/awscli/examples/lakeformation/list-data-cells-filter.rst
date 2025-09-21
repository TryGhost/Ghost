**To list data cell filters**

The following ``list-data-cells-filter`` example list data cell filter for given table. ::

    aws lakeformation list-data-cells-filter \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "MaxResults": 2,
        "Table": {
            "CatalogId": "123456789111",
            "DatabaseName": "tpc",
            "Name": "dl_tpc_promotion"
        }
    }

Output::

    {
        "DataCellsFilters": [{
                "TableCatalogId": "123456789111",
                "DatabaseName": "tpc",
                "TableName": "dl_tpc_promotion",
                "Name": "developer_promotion",
                "RowFilter": {
                    "FilterExpression": "p_promo_name='ese'"
                },
                "ColumnNames": [
                    "p_channel_details",
                    "p_start_date_sk",
                    "p_purpose",
                    "p_promo_id",
                    "p_promo_name",
                    "p_end_date_sk",
                    "p_discount_active"
                ]
            },
            {
                "TableCatalogId": "123456789111",
                "DatabaseName": "tpc",
                "TableName": "dl_tpc_promotion",
                "Name": "developer_promotion_allrows",
                "RowFilter": {
                    "FilterExpression": "TRUE",
                    "AllRowsWildcard": {}
                },
                "ColumnNames": [
                    "p_channel_details",
                    "p_start_date_sk",
                    "p_promo_name"
                ]
            }
        ],
        "NextToken": "2MDA2MTgwNiwibmFub3MiOjE0MDAwMDAwMH19"
    }

For more information, see `Data filtering and cell-level security in Lake Formation <https://docs.aws.amazon.com/lake-formation/latest/dg/data-filtering.html>`__ in the *AWS Lake Formation Developer Guide*.
