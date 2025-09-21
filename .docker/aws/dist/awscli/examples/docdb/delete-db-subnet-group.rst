**To delete an Amazon DocumentDB subnet group**

The following ``delete-db-subnet-group`` example deletes the Amazon DocumentDB subnet group ``sample-subnet-group``. ::

    aws docdb delete-db-subnet-group \
        --db-subnet-group-name sample-subnet-group

This command produces no output.

For more information, see `Deleting an Amazon DocumentDB Subnet Group <https://docs.aws.amazon.com/documentdb/latest/developerguide/document-db-subnet-groups.html#document-db-subnet-group-delete>`__ in the *Amazon DocumentDB Developer Guide*.
