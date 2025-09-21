**To list all MFA devices for a specified user**

This example returns details about the MFA device assigned to the IAM user ``Bob``. ::

    aws iam list-mfa-devices \
        --user-name Bob

Output::

    {
        "MFADevices": [
            {
                "UserName": "Bob",
                "SerialNumber": "arn:aws:iam::123456789012:mfa/Bob",
                "EnableDate": "2019-10-28T20:37:09+00:00"
            },
            {
                "UserName": "Bob",
                "SerialNumber": "GAKT12345678",
                "EnableDate": "2023-02-18T21:44:42+00:00"
            },
            {
                "UserName": "Bob",
                "SerialNumber": "arn:aws:iam::123456789012:u2f/user/Bob/fidosecuritykey1-7XNL7NFNLZ123456789EXAMPLE",
                "EnableDate": "2023-09-19T02:25:35+00:00"
            },
            {
                "UserName": "Bob",
                "SerialNumber": "arn:aws:iam::123456789012:u2f/user/Bob/fidosecuritykey2-VDRQTDBBN5123456789EXAMPLE",
                "EnableDate": "2023-09-19T01:49:18+00:00"
            }
        ]
    }

For more information, see `Using multi-factor authentication (MFA) in AWS <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html>`__ in the *AWS IAM User Guide*.