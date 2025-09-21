**To delete a cache parameter group**

The following ``delete-cache-parameter-group`` example deletes the specified cache parameter group. You can't delete a cache parameter group if it's associated with any cache clusters. ::

    aws elasticache delete-cache-parameter-group \
        --cache-parameter-group-name myparamgroup

This command produces no output.

For more information, see `Deleting a Parameter Group <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/ParameterGroups.Deleting.html>`__ in the *Elasticache User Guide*.