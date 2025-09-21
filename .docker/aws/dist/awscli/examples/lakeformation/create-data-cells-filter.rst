**Example 1: To create data cell filter**

The following ``create-data-cells-filter`` example creates a data cell filter to allow one to grant access to certain columns based on row condition. ::

    aws lakeformation create-data-cells-filter \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "TableData": {
            "ColumnNames": ["p_channel_details", "p_start_date_sk", "p_promo_name"],
            "DatabaseName": "tpc",
            "Name": "developer_promotion",
            "RowFilter": {
                "FilterExpression": "p_promo_name='ese'"
            },
            "TableCatalogId": "123456789111",
            "TableName": "dl_tpc_promotion"
        }
    }

This command produces no output.

For more information, see `Data filtering and cell-level security in Lake Formation <https://docs.aws.amazon.com/lake-formation/latest/dg/data-filtering.html>`__ in the *AWS Lake Formation Developer Guide*.

**Example 2: To create column filter**

The following ``create-data-cells-filter`` example creates a data filter to allow one to grant access to certain columns. ::

    aws lakeformation create-data-cells-filter \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "TableData": {
            "ColumnNames": ["p_channel_details", "p_start_date_sk", "p_promo_name"],
            "DatabaseName": "tpc",
            "Name": "developer_promotion_allrows",
            "RowFilter": {
                "AllRowsWildcard": {}
            },
            "TableCatalogId": "123456789111",
            "TableName": "dl_tpc_promotion"
        }
    }

This command produces no output.

For more information, see `Data filtering and cell-level security in Lake Formation <https://docs.aws.amazon.com/lake-formation/latest/dg/data-filtering.html>`__ in the *AWS Lake Formation Developer Guide*.

**Example 3: To create data filter with exclude columns**

The following ``create-data-cells-filter`` example creates a data filter to allow one to grant access all except the mentioned columns. ::

    aws lakeformation create-data-cells-filter \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "TableData": {
            "ColumnWildcard": {
                "ExcludedColumnNames": ["p_channel_details", "p_start_date_sk"]
            },
            "DatabaseName": "tpc",
            "Name": "developer_promotion_excludecolumn",
            "RowFilter": {
                "AllRowsWildcard": {}
            },
            "TableCatalogId": "123456789111",
            "TableName": "dl_tpc_promotion"
        }
    }

This command produces no output.

For more information, see `Data filtering and cell-level security in Lake Formation <https://docs.aws.amazon.com/lake-formation/latest/dg/data-filtering.html>`__ in the *AWS Lake Formation Developer Guide*.
