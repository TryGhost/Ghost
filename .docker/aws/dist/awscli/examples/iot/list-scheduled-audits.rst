**To list the scheduled audits for your AWS account**

The following ``list-scheduled-audits`` example lists any audits scheduled for your AWS account. ::

    aws iot list-scheduled-audits

Output::

    {
        "scheduledAudits": [
            {
                "scheduledAuditName": "AWSIoTDeviceDefenderDailyAudit",
                "scheduledAuditArn": "arn:aws:iot:us-west-2:123456789012:scheduledaudit/AWSIoTDeviceDefenderDailyAudit",
                "frequency": "DAILY"
            },
            {
                "scheduledAuditName": "AWSDeviceDefenderWeeklyAudit",
                "scheduledAuditArn": "arn:aws:iot:us-west-2:123456789012:scheduledaudit/AWSDeviceDefenderWeeklyAudit",
                "frequency": "WEEKLY",
                "dayOfWeek": "SUN"
            }
        ]
    }

For more information, see `Audit Commands <https://docs.aws.amazon.com/iot/latest/developerguide/AuditCommands.html>`__ in the *AWS IoT Developer Guide*.
