**To list the details of an audit mitigation action execution**

An audit mitigation action task applies a mitigation action to one or more findings from an AWS IoT Device 
Defender audit. The following ``list-audit-mitigation-actions-executions`` example lists the details for the 
mitigation action task with the specified ``taskId`` and for the specified finding. ::

    aws iot list-audit-mitigation-actions-executions \
        --task-id myActionsTaskId \
        --finding-id 0edbaaec-2fe1-4cf5-abc9-d4c3e51f7464

Output::

    {
        "actionsExecutions": [
            {
                "taskId": "myActionsTaskId",
                "findingId": "0edbaaec-2fe1-4cf5-abc9-d4c3e51f7464",
                "actionName": "ResetPolicyVersionAction",
                "actionId": "1ea0b415-bef1-4a01-bd13-72fb63c59afb",
                "status": "COMPLETED",
                "startTime": "2019-12-10T15:19:13.279000-08:00",
                "endTime": "2019-12-10T15:19:13.337000-08:00"
            }
        ]
    }

For more information, see `ListAuditMitigationActionsExecutions (Mitigation Action Commands) <https://docs.aws.amazon.com/iot/latest/developerguide/mitigation-action-commands.html#dd-api-iot-ListAuditMitigationActionsExecutions>`__ in the *AWS IoT Developer Guide*.
