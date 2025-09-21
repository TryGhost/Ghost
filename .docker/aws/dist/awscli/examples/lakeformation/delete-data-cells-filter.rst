**To delete data cell filter**

The following ``delete-data-cells-filter`` example deletes given data cell filter. ::

    aws lakeformation delete-data-cells-filter \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "TableCatalogId": "123456789111",
        "DatabaseName": "tpc",
        "TableName": "dl_tpc_promotion",
        "Name": "developer_promotion"
    }

This command produces no output.

For more information, see `Data filtering and cell-level security in Lake Formation <https://docs.aws.amazon.com/lake-formation/latest/dg/data-filtering.html>`__ in the *AWS Lake Formation Developer Guide*.
