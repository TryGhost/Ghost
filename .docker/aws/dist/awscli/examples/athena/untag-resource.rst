**To remove a tag from a resource**

The following ``untag-resource`` example removes the ``Specialization`` and ``Focus`` keys and their associated values from the ``dynamo_db_catalog`` data catalog resource. ::

    aws athena untag-resource \
        --resource-arn arn:aws:athena:us-west-2:111122223333:datacatalog/dynamo_db_catalog \
        --tag-keys Specialization Focus

This command produces no output. To see the results, use the ``list-tags-for-resource`` command.

For more information, see `Removing tags from a resource: untag-resource <https://docs.aws.amazon.com/athena/latest/ug/tags-operations.html#tags-operations-examples-cli-untag-resource>`__ in the *Amazon Athena User Guide*.