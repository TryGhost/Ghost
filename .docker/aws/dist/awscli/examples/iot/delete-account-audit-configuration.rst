**To disable all audit checks for your AWS account**

The following ``delete-account-audit-configuration`` example restores the default settings for AWS IoT Device Defender for this account, disabling all audit checks and clearing configuration data. It also deletes any scheduled audits for this account. **Use this command with caution.** ::

    aws iot delete-account-audit-configuration \
        --delete-scheduled-audits

This command produces no output.

For more information, see `Audit Commands <https://docs.aws.amazon.com/iot/latest/developerguide/AuditCommands.html>`__ in the *AWS IoT Developer Guide*.
