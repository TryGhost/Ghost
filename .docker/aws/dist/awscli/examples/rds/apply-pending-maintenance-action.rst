**To apply pending maintenance actions**

The following ``apply-pending-maintenance-action`` example applies the pending maintenance actions for a DB cluster. ::

    aws rds apply-pending-maintenance-action \
        --resource-identifier arn:aws:rds:us-east-1:123456789012:cluster:my-db-cluster \
        --apply-action system-update \
        --opt-in-type immediate

Output::

    {
        "ResourcePendingMaintenanceActions": {
            "ResourceIdentifier": "arn:aws:rds:us-east-1:123456789012:cluster:my-db-cluster",
            "PendingMaintenanceActionDetails": [
                {
                    "Action": "system-update",
                    "OptInStatus": "immediate",
                    "CurrentApplyDate": "2021-01-23T01:07:36.100Z",
                    "Description": "Upgrade to Aurora PostgreSQL 3.3.2"
                }
            ]
        }
    }

For more information, see `Maintaining a DB instance <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.Maintenance.html>`__ in the *Amazon RDS User Guide* and `Maintaining an Amazon Aurora DB cluster <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_UpgradeDBInstance.Maintenance.html>`__ in the *Amazon Aurora User Guide*.