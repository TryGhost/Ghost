**To return information about a data catalog**

The following ``get-data-catalog`` example returns information about the ``dynamo_db_catalog`` data catalog. ::

    aws athena get-data-catalog \
        --name dynamo_db_catalog

Output::

    {
        "DataCatalog": {
            "Name": "dynamo_db_catalog",
            "Description": "DynamoDB Catalog",
            "Type": "LAMBDA",
            "Parameters": {
                "catalog": "dynamo_db_catalog",
                "metadata-function": "arn:aws:lambda:us-west-2:111122223333:function:dynamo_db_lambda",
                "record-function": "arn:aws:lambda:us-west-2:111122223333:function:dynamo_db_lambda"
            }
        }
    }

For more information, see `Showing Catalog Details: get-data-catalog <https://docs.aws.amazon.com/athena/latest/ug/datastores-hive-cli.html#datastores-hive-cli-showing-details-of-a-catalog>`__ in the *Amazon Athena User Guide*.