**To get details about an audit finding suppression**

The following ``describe-audit-suppression`` example lists details about an audit finding suppression. ::

    aws iot describe-audit-task \
        --task-id "787ed873b69cb4d6cdbae6ddd06996c5"

Output::

    {
        "taskStatus": "COMPLETED",
        "taskType": "SCHEDULED_AUDIT_TASK",
        "taskStartTime": 1596168096.157,
        "taskStatistics": {
            "totalChecks": 1,
            "inProgressChecks": 0,
            "waitingForDataCollectionChecks": 0,
            "compliantChecks": 0,
            "nonCompliantChecks": 1,
            "failedChecks": 0,
            "canceledChecks": 0
        },
        "scheduledAuditName": "AWSIoTDeviceDefenderDailyAudit",
        "auditDetails": {
            "DEVICE_CERTIFICATE_EXPIRING_CHECK": {
                "checkRunStatus": "COMPLETED_NON_COMPLIANT",
                "checkCompliant": false,
                "totalResourcesCount": 195,
                "nonCompliantResourcesCount": 2
            }
        }
    }

For more information, see `Audit finding suppressions <https://docs.aws.amazon.com/iot/latest/developerguide/audit-finding-suppressions.html>`__ in the *AWS IoT Developers Guide*.