**To cancel an audit mitigation actions task**

The following ``cancel-audit-mitigations-action-task`` example cancels the application of mitigation actions for the specified task. You cannot cancel tasks that are already completed. ::

    aws iot cancel-audit-mitigation-actions-task
        --task-id "myActionsTaskId"

This command produces no output.

For more information, see `CancelAuditMitigationActionsTask  (Mitigation Action Commands) <https://docs.aws.amazon.com/iot/latest/developerguide/mitigation-action-commands.html#dd-api-iot-CancelAuditMitigationActionsTask>`__ in the *AWS IoT Developer Guide*.
