**To return information about a database in a data catalog**

The following ``get-database`` example returns information about the ``sampledb`` database in the ``AwsDataCatalog`` data catalog. ::

    aws athena get-database \
        --catalog-name AwsDataCatalog \
        --database-name sampledb

Output::

    {
        "Database": {
            "Name": "sampledb",
            "Description": "Sample database",
            "Parameters": {
                "CreatedBy": "Athena",
                "EXTERNAL": "TRUE"
            }
        }
    }

For more information, see `Showing Database Details: get-database <https://docs.aws.amazon.com/athena/latest/ug/datastores-hive-cli.html#datastores-hive-cli-showing-details-of-a-database>`__ in the *Amazon Athena User Guide*.