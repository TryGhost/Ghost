**Example 1: To enable Amazon SNS notifications for audit notifications**

The following ``update-account-audit-configuration`` example enables Amazon SNS notifications for AWS IoT Device Defender audit notifications, specifying a target and the role used to write to that target. ::

    aws iot update-account-audit-configuration \
        --audit-notification-target-configurations "SNS={targetArn=\"arn:aws:sns:us-west-2:123456789012:ddaudits\",roleArn=\"arn:aws:iam::123456789012:role/service-role/AWSIoTDeviceDefenderAudit\",enabled=true}"

This command produces no output.

**Example 2: To enable an audit check**

The following ``update-account-audit-configuration`` example enables the AWS IoT Device Defender audit check named ``AUTHENTICATED_COGNITO_ROLE_OVERLY_PERMISSIVE_CHECK``. You cannot disable an audit check if it is part of the ``targetCheckNames`` for one or more scheduled audits for the AWS account.  ::

    aws iot update-account-audit-configuration \
        --audit-check-configurations "{\"AUTHENTICATED_COGNITO_ROLE_OVERLY_PERMISSIVE_CHECK\":{\"enabled\":true}}"

This command produces no output.

For more information, see `Audit Commands <https://docs.aws.amazon.com/iot/latest/developerguide/AuditCommands.html>`__ in the *AWS IoT Developer Guide*.
