**To add a tag to a resource**

The following ``tag-resource`` example adds three tags to the ``dynamo_db_catalog`` data catalog. ::

    aws athena tag-resource \
        --resource-arn arn:aws:athena:us-west-2:111122223333:datacatalog/dynamo_db_catalog \
        --tags Key=Organization,Value=Retail Key=Division,Value=Mountain Key=Product_Line,Value=Shoes Key=Location,Value=Denver

This command produces no output. To see the  result, use ``aws athena list-tags-for-resource --resource-arn arn:aws:athena:us-west-2:111122223333:datacatalog/dynamo_db_catalog``.

For more information, see `Adding tags to a resource: tag-resource <https://docs.aws.amazon.com/athena/latest/ug/tags-operations.html#tags-operations-examples-cli-tag-resource>`__ in the *Amazon Athena User Guide*.