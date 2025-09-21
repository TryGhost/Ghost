**To remove tags from an Amazon DocumentDB resource**

The following ``remove-tags-from-resource`` example removes the tag with the key named ``B`` from the Amazon DocumentDB cluster ``sample-cluster``. ::

    aws docdb remove-tags-from-resource \
        --resource-name arn:aws:rds:us-west-2:123456789012:cluster:sample-cluster \
        --tag-keys B

This command produces no output.

For more information, see `Removing Tags from an Amazon DocumentDBResource <https://docs.aws.amazon.com/documentdb/latest/developerguide/tagging.html#tagging-remove>`__ in the *Amazon DocumentDB Developer Guide*.
