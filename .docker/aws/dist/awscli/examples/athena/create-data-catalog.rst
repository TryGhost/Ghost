**To create a data catalog**

The following ``create-data-catalog`` example creates the ``dynamo_db_catalog`` data catalog. ::

    aws athena create-data-catalog \
        --name dynamo_db_catalog \
        --type LAMBDA \
        --description "DynamoDB Catalog" \
        --parameters function=arn:aws:lambda:us-west-2:111122223333:function:dynamo_db_lambda

This command produces no output. To see the result, use ``aws athena get-data-catalog --name dynamo_db_catalog``.

For more information, see `Registering a Catalog: create-data-catalog <https://docs.aws.amazon.com/athena/latest/ug/datastores-hive-cli.html#datastores-hive-cli-registering-a-catalog>`__ in the *Amazon Athena User Guide*.