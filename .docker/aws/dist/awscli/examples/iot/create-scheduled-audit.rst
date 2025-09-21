**To create a scheduled audit**

The following ``create-scheduled-audit`` example creates a scheduled audit that runs weekly, on Wednesday, to check if CA certificates or device certificates are expiring. ::

    aws iot create-scheduled-audit \
        --scheduled-audit-name WednesdayCertCheck \
        --frequency WEEKLY \
        --day-of-week WED \
        --target-check-names CA_CERTIFICATE_EXPIRING_CHECK DEVICE_CERTIFICATE_EXPIRING_CHECK

Output::

    {
        "scheduledAuditArn": "arn:aws:iot:us-west-2:123456789012:scheduledaudit/WednesdayCertCheck"
    }

For more information, see `Audit Commands <https://docs.aws.amazon.com/iot/latest/developerguide/AuditCommands.html>`__ in the *AWS IoT Developer Guide*.
