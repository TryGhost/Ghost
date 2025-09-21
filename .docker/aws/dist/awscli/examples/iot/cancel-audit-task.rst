**To cancel an audit task**

The following ``cancel-audit-task`` example cancels an audit task with the specified task ID. You cannot cancel a task that is complete. ::

    aws iot cancel-audit-task \
        --task-id a3aea009955e501a31b764abe1bebd3d

This command produces no output.

For more information, see `Audit Commands <https://docs.aws.amazon.com/iot/latest/developerguide/AuditCommands.html>`__ in the *AWS IoT Developer Guide*.
