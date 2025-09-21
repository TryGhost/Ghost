**To update a scheduled audit definition**

The following ``update-scheduled-audit`` example changes the target check names for an AWS IoT Device Defender scheduled audit. ::

    aws iot update-scheduled-audit \
        --scheduled-audit-name WednesdayCertCheck \
        --target-check-names CA_CERTIFICATE_EXPIRING_CHECK DEVICE_CERTIFICATE_EXPIRING_CHECK REVOKED_CA_CERTIFICATE_STILL_ACTIVE_CHECK

Output::

    {
        "scheduledAuditArn": "arn:aws:iot:us-west-2:123456789012:scheduledaudit/WednesdayCertCheck"
    }

For more information, see `Audit Commands <https://docs.aws.amazon.com/iot/latest/developerguide/AuditCommands.html>`__ in the *AWS IoT Developer Guide*.
