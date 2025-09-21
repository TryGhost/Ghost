**To get information about an audit instance**

The following ``describe-audit-task`` example gets information about an instance of an AWS IoT Device Defender audit. If the audit is complete, summary statistics for the run are included in the results. ::

    aws iot describe-audit-task \
        --task-id a3aea009955e501a31b764abe1bebd3d

Output::

     {
        "taskStatus": "COMPLETED",
        "taskType": "ON_DEMAND_AUDIT_TASK",
        "taskStartTime": 1560356923.434,
        "taskStatistics": {
            "totalChecks": 3,
            "inProgressChecks": 0,
            "waitingForDataCollectionChecks": 0,
            "compliantChecks": 3,
            "nonCompliantChecks": 0,
            "failedChecks": 0,
            "canceledChecks": 0
        },
        "auditDetails": {
            "CA_CERTIFICATE_EXPIRING_CHECK": {
                "checkRunStatus": "COMPLETED_COMPLIANT",
                "checkCompliant": true,
                "totalResourcesCount": 0,
                "nonCompliantResourcesCount": 0
            },
            "DEVICE_CERTIFICATE_EXPIRING_CHECK": {
                "checkRunStatus": "COMPLETED_COMPLIANT",
                "checkCompliant": true,
                "totalResourcesCount": 6,
                "nonCompliantResourcesCount": 0
            },
            "REVOKED_CA_CERTIFICATE_STILL_ACTIVE_CHECK": {
                "checkRunStatus": "COMPLETED_COMPLIANT",
                "checkCompliant": true,
                "totalResourcesCount": 0,
                "nonCompliantResourcesCount": 0
            }
        }
    }

For more information, see `Audit Commands <https://docs.aws.amazon.com/iot/latest/developerguide/AuditCommands.html>`__ in the *AWS IoT Developer Guide*.
