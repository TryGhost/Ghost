**To start an audit right away**

The following ``start-on-demand-audit-task`` example starts an AWS IoT Device Defender audit and performs three certificate checks. ::

    aws iot start-on-demand-audit-task \
        --target-check-names CA_CERTIFICATE_EXPIRING_CHECK DEVICE_CERTIFICATE_EXPIRING_CHECK REVOKED_CA_CERTIFICATE_STILL_ACTIVE_CHECK

Output::

    {
        "taskId": "a3aea009955e501a31b764abe1bebd3d"
    }

For more information, see `Audit Commands <https://docs.aws.amazon.com/iot/latest/developerguide/AuditCommands.html>`__ in the *AWS IoT Developer Guide*.
