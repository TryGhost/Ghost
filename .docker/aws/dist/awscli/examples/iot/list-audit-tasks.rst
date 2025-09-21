**To list all findings from an audit**

The following ``list-audit-tasks`` example lists the audit tasks that ran between June 5, 2019 and June 12, 2019. ::

    aws iot list-audit-tasks \
        --start-time 1559747125 \
        --end-time 1560357228

Output::

    {
        "tasks": [
            {
                "taskId": "a3aea009955e501a31b764abe1bebd3d",
                "taskStatus": "COMPLETED",
                "taskType": "ON_DEMAND_AUDIT_TASK"
            },
            {
                "taskId": "f76b4b5102b632cd9ae38a279c266da1",
                "taskStatus": "COMPLETED",
                "taskType": "SCHEDULED_AUDIT_TASK"
            },
            {
                "taskId": "51d9967d9f9ff4d26529505f6d2c444a",
                "taskStatus": "COMPLETED",
                "taskType": "SCHEDULED_AUDIT_TASK"
            },
            {
                "taskId": "eeef61068b0eb03c456d746c5a26ee04",
                "taskStatus": "COMPLETED",
                "taskType": "SCHEDULED_AUDIT_TASK"
            },
            {
                "taskId": "041c49557b7c7b04c079a49514b55589",
                "taskStatus": "COMPLETED",
                "taskType": "SCHEDULED_AUDIT_TASK"
            },
            {
                "taskId": "82c7f2afac1562d18a4560be73998acc",
                "taskStatus": "COMPLETED",
                "taskType": "SCHEDULED_AUDIT_TASK"
            },
            {
                "taskId": "bade6b5efd2e1b1569822f6021b39cf5",
                "taskStatus": "COMPLETED",
                "taskType": "SCHEDULED_AUDIT_TASK"
            },
            {
                "taskId": "c23f6233ba2d35879c4bb2810fb5ffd6",
                "taskStatus": "COMPLETED",
                "taskType": "SCHEDULED_AUDIT_TASK"
            },
            {
                "taskId": "ac9086b7222a2f5e2e17bb6fd30b3aeb",
                "taskStatus": "COMPLETED",
                "taskType": "SCHEDULED_AUDIT_TASK"
            }
        ]
    }

For more information, see `Audit Commands <https://docs.aws.amazon.com/iot/latest/developerguide/AuditCommands.html>`__ in the *AWS IoT Developer Guide*.
