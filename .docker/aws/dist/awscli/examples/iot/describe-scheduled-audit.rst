**To get information about a scheduled audit**

The following ``describe-scheduled-audit`` example gets detailed information about an AWS IOT Device Defender scheduled audit named ``AWSIoTDeviceDefenderDailyAudit``. ::

    aws iot describe-scheduled-audit \
        --scheduled-audit-name AWSIoTDeviceDefenderDailyAudit

Output::

    {
        "frequency": "DAILY",
        "targetCheckNames": [
            "AUTHENTICATED_COGNITO_ROLE_OVERLY_PERMISSIVE_CHECK",
            "CONFLICTING_CLIENT_IDS_CHECK",
            "DEVICE_CERTIFICATE_SHARED_CHECK",
            "IOT_POLICY_OVERLY_PERMISSIVE_CHECK",
            "REVOKED_CA_CERTIFICATE_STILL_ACTIVE_CHECK",
            "UNAUTHENTICATED_COGNITO_ROLE_OVERLY_PERMISSIVE_CHECK"
        ],
        "scheduledAuditName": "AWSIoTDeviceDefenderDailyAudit",
        "scheduledAuditArn": "arn:aws:iot:us-west-2:123456789012:scheduledaudit/AWSIoTDeviceDefenderDailyAudit"
    }

For more information, see `Audit Commands <https://docs.aws.amazon.com/iot/latest/developerguide/AuditCommands.html>`__ in the *AWS IoT Developer Guide*.
