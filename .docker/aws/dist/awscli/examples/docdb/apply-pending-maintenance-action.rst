**To have pending maintenance actions take place during the next maintenance window**

The following ``apply-pending-maintenance-action`` example causes all system-update actions to be performed during the next scheduled maintenance window. ::

    aws docdb apply-pending-maintenance-action \
    --resource-identifier arn:aws:rds:us-west-2:123456789012:cluster:sample-cluster \
    --apply-action system-update \
    --opt-in-type next-maintenance

This command produces no output.

For more information, see `Applying Amazon DocumentDB Updates <https://docs.aws.amazon.com/documentdb/latest/developerguide/db-instance-maintain.html#db-instance-updates-apply>`__ in the *Amazon DocumentDB Developer Guide*.
