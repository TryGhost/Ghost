**To delete an Amazon DocumentDB cluster parameter group**

The following ``delete-db-cluster-parameter-group`` example deletes the Amazon DocumentDB parameter group ``sample-parameter-group``. ::

    aws docdb delete-db-cluster-parameter-group \
        --db-cluster-parameter-group-name sample-parameter-group 

This command produces no output.

For more information, see `Deleting an Amazon DocumentDB Cluster Parameter Group <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-cluster-parameter-group-delete.html>`__ in the *Amazon DocumentDB Developer Guide*.
