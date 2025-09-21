**To delete a cache subnet group**

The following ``delete-cache-subnet-group`` example deletes the specified cache subnet group. You can't delete a cache subnet group if it's associated with any clusters. ::

    aws elasticache delete-cache-subnet-group \
        --cache-subnet-group-name "mygroup"

This command produces no output.

For more information, see `Deleting a Subnet Group <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/SubnetGroups.Deleting.html>`__ in the *Elasticache User Guide*.
