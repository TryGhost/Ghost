**To list the data catalogs registered with Athena**

The following ``list-data-catalogs`` example lists the data catalogs registered with Athena. ::

    aws athena list-data-catalogs

Output::

    {
        "DataCatalogsSummary": [
            {
                "CatalogName": "AwsDataCatalog",
                "Type": "GLUE"
            },
            {
                "CatalogName": "cw_logs_catalog",
                "Type": "LAMBDA"
            },
            {
                "CatalogName": "cw_metrics_catalog",
                "Type": "LAMBDA"
            }
        ]
    }

For more information, see `Listing Registered Catalogs: list-data-catalogs <https://docs.aws.amazon.com/athena/latest/ug/datastores-hive-cli.html#datastores-hive-cli-listing-registered-catalogs>`__ in the *Amazon Athena User Guide*.