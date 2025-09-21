**To update a data catalog**

The following ``update-data-catalog`` example updates the Lambda function and description of the ``cw_logs_catalog`` data catalog. ::

    aws athena update-data-catalog \
        --name cw_logs_catalog \
        --type LAMBDA \
        --description "New CloudWatch Logs Catalog" \
        --function=arn:aws:lambda:us-west-2:111122223333:function:new_cw_logs_lambda

This command produces no output. To see the result, use ``aws athena get-data-catalog --name cw_logs_catalog``.

For more information, see `Updating a Catalog: update-data-catalog <https://docs.aws.amazon.com/athena/latest/ug/datastores-hive-cli.html#datastores-hive-cli-updating-a-catalog>`__ in the *Amazon Athena User Guide*.