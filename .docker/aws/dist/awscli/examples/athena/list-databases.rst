**To list the databases in a data catalog**

The following ``list-databases`` example lists the databases in the ``AwsDataCatalog`` data catalog. ::

    aws athena list-databases \
        --catalog-name AwsDataCatalog

Output::

    {
        "DatabaseList": [
            {
                "Name": "default"
            },
            {
                "Name": "mydatabase"
            },
            {
                "Name": "newdb"
            },
            {
                "Name": "sampledb",
                "Description": "Sample database",
                "Parameters": {
                    "CreatedBy": "Athena",
                    "EXTERNAL": "TRUE"
                }
            },
            {
                "Name": "webdata"
            }
        ]
    }    
       
For more information, see `Listing Databases in a Catalog: list-databases <https://docs.aws.amazon.com/athena/latest/ug/datastores-hive-cli.html#datastores-hive-cli-listing-databases>`__ in the *Amazon Athena User Guide*.