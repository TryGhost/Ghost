**To enable an MFA device**

After you use the ``create-virtual-mfa-device`` command to create a new virtual MFA device, you can assign the MFA device to a user. The following ``enable-mfa-device`` example assigns the MFA device with the serial number ``arn:aws:iam::210987654321:mfa/BobsMFADevice`` to the user ``Bob``. The command also synchronizes the device with AWS by including the first two codes in sequence from the virtual MFA device. ::

    aws iam enable-mfa-device \
        --user-name Bob \
        --serial-number arn:aws:iam::210987654321:mfa/BobsMFADevice \
        --authentication-code1 123456 \
        --authentication-code2 789012

This command produces no output.

For more information, see `Enabling a virtual multi-factor authentication (MFA) device <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html>`__ in the *AWS IAM User Guide*.