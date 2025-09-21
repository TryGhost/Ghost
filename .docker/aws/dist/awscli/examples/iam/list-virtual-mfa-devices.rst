**To list virtual MFA devices**

The following ``list-virtual-mfa-devices`` command lists the virtual MFA devices that have been configured for the current account. ::

    aws iam list-virtual-mfa-devices

Output::

    {
        "VirtualMFADevices": [
            {
                "SerialNumber": "arn:aws:iam::123456789012:mfa/ExampleMFADevice"
            },
            {
                "SerialNumber": "arn:aws:iam::123456789012:mfa/Fred"
            }
        ]
    }

For more information, see `Enabling a virtual multi-factor authentication (MFA) device <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html>`__ in the *AWS IAM User Guide*.