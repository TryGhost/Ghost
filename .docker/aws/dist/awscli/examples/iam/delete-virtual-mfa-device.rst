**To remove a virtual MFA device**

The following ``delete-virtual-mfa-device`` command removes the specified MFA device from the current account. ::

    aws iam delete-virtual-mfa-device \
        --serial-number arn:aws:iam::123456789012:mfa/MFATest

This command produces no output.

For more information, see `Deactivating MFA devices <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_disable.html>`__ in the *AWS IAM User Guide*.