**To list resources with at least one pending maintenance action**

The following ``describe-pending-maintenance-actions`` example lists the pending maintenace action for a DB instance. ::

    aws rds describe-pending-maintenance-actions

Output::

    {
        "PendingMaintenanceActions": [
            {
                "ResourceIdentifier": "arn:aws:rds:us-west-2:123456789012:cluster:global-db1-cl1",
                "PendingMaintenanceActionDetails": [
                    {
                        "Action": "system-update",
                        "Description": "Upgrade to Aurora PostgreSQL 2.4.2"
                    }
                ]
            }
        ]
    }

For more information, see `Maintaining a DB Instance <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.Maintenance.html>`__ in the *Amazon RDS User Guide*.
