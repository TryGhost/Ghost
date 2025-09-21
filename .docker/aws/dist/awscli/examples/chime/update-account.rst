**To update an account**

The following ``update-account`` example updates the specified account name. ::

    aws chime update-account \
        --account-id a1b2c3d4-5678-90ab-cdef-11111EXAMPLE \
        --name MyAccountName

Output::

    {
        "Account": {
            "AwsAccountId": "111122223333",
            "AccountId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
            "Name": "MyAccountName",
            "AccountType": "Team",
            "CreatedTimestamp": "2018-09-04T21:44:22.292Z",
            "DefaultLicense": "Pro",
            "SupportedLicenses": [
                "Basic",
                "Pro"
            ],
            "SigninDelegateGroups": [
                {
                    "GroupName": "myGroup"
                },
            ]
        }
    }

For more information, see `Renaming Your Account <https://docs.aws.amazon.com/chime/latest/ag/rename-account.html>`__ in the *Amazon Chime Administration Guide*.
