**To view current audit configuration settings**

The following ``describe-account-audit-configuration`` example lists the current settings for your AWS IoT Device Defender audit configuration. ::

    aws iot describe-account-audit-configuration

Output::

    {
        "roleArn": "arn:aws:iam::123456789012:role/service-role/AWSIoTDeviceDefenderAudit_1551201085996",
        "auditNotificationTargetConfigurations": {
            "SNS": {
                "targetArn": "arn:aws:sns:us-west-2:123456789012:ddaudits",
                "roleArn": "arn:aws:iam::123456789012:role/service-role/AWSIoTDeviceDefenderAudit",
                "enabled": true
            }
        },
        "auditCheckConfigurations": {
            "AUTHENTICATED_COGNITO_ROLE_OVERLY_PERMISSIVE_CHECK": {
                "enabled": true
            },
            "CA_CERTIFICATE_EXPIRING_CHECK": {
                "enabled": true
            },
            "CONFLICTING_CLIENT_IDS_CHECK": {
                "enabled": true
            },
            "DEVICE_CERTIFICATE_EXPIRING_CHECK": {
                "enabled": true
            },
            "DEVICE_CERTIFICATE_SHARED_CHECK": {
                "enabled": true
            },
            "IOT_POLICY_OVERLY_PERMISSIVE_CHECK": {
                "enabled": true
            },
            "LOGGING_DISABLED_CHECK": {
                "enabled": true
            },
            "REVOKED_CA_CERTIFICATE_STILL_ACTIVE_CHECK": {
                "enabled": true
            },
            "REVOKED_DEVICE_CERTIFICATE_STILL_ACTIVE_CHECK": {
                "enabled": true
            },
            "UNAUTHENTICATED_COGNITO_ROLE_OVERLY_PERMISSIVE_CHECK": {
                "enabled": true
            }
        }
    }

For more information, see `Audit Commands <https://docs.aws.amazon.com/iot/latest/developerguide/AuditCommands.html>`__ in the *AWS IoT Developer Guide*.
