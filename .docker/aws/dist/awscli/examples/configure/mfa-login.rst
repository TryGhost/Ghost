**To create a new profile with temporary MFA credentials**

The following ``mfa-login`` command creates a new profile with temporary credentials obtained using MFA authentication. ::

    aws configure mfa-login

Output::

    MFA serial number or ARN: arn:aws:iam::123456789012:mfa/MFADeviceName
    MFA token code: 123456
    Profile to update [session-MFADeviceName]:
    Temporary credentials written to profile 'session-MFADeviceName'
    Credentials will expire at 2023-05-19 18:06:10 UTC
    To use these credentials, specify --profile session-MFADeviceName when running AWS CLI commands

**To create credentials when no default profile exists**

If you don't have a default profile configured, the ``mfa-login`` command will prompt you for your AWS credentials first. ::

    aws configure mfa-login

Output::

    No default profile found. Please provide your AWS credentials:
    AWS Access Key ID: AKIAIOSFODNN7EXAMPLE
    AWS Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
    MFA serial number or ARN: arn:aws:iam::123456789012:mfa/MFADeviceName
    MFA token code: 123456
    Profile to update [session-MFADeviceName]:
    Temporary credentials written to profile 'session-MFADeviceName'
    Credentials will expire at 2023-05-19 18:06:10 UTC
    To use these credentials, specify --profile session-MFADeviceName when running AWS CLI commands

**To update an existing profile with temporary MFA credentials**

The following ``mfa-login`` command updates an existing profile with temporary credentials obtained using MFA authentication. ::

    aws configure mfa-login --profile myprofile --update-profile mfaprofile

Output::

    MFA token code: 123456
    Temporary credentials written to profile 'mfaprofile'
    Credentials will expire at 2023-05-19 18:06:10 UTC
    To use these credentials, specify --profile mfaprofile when running AWS CLI commands

**Note:** This command currently supports only hardware or software based one-time password (OTP) authenticators. Passkeys and U2F devices are not currently supported with this command.

For more information, see `Using Multi-Factor Authentication (MFA) in AWS <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html>`__ in the *AWS IAM User Guide*.