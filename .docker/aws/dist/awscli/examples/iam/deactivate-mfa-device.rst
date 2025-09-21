**To deactivate an MFA device**

This command deactivates the virtual MFA device with the ARN ``arn:aws:iam::210987654321:mfa/BobsMFADevice`` that is associated with the user ``Bob``. ::

    aws iam deactivate-mfa-device \
        --user-name Bob \
        --serial-number arn:aws:iam::210987654321:mfa/BobsMFADevice

This command produces no output.

For more information, see `Using multi-factor authentication (MFA) in AWS <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html>`__ in the *AWS IAM User Guide*.