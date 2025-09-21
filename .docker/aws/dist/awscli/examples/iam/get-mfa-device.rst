**To retrieve information about a FIDO security key**

The following ``get-mfa-device`` command example retrieves information about the specified FIDO security key. ::

    aws iam get-mfa-device \
        --serial-number arn:aws:iam::123456789012:u2f/user/alice/fidokeyname-EXAMPLEBN5FHTECLFG7EXAMPLE

Output::

    {
        "UserName": "alice",
        "SerialNumber": "arn:aws:iam::123456789012:u2f/user/alice/fidokeyname-EXAMPLEBN5FHTECLFG7EXAMPLE",
        "EnableDate": "2023-09-19T01:49:18+00:00",
        "Certifications": {
            "FIDO": "L1"
        }
    }

For more information, see `Using multi-factor authentication (MFA) in AWS <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html>`__ in the *AWS IAM User Guide*.