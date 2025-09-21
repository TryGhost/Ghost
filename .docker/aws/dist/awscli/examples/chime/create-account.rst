**To create an account**

The following ``create-account`` example creates an Amazon Chime account under the administrator's AWS account. ::

    aws chime create-account \
        --name MyChimeAccount

Output::

    {
        "Account": {
            "AwsAccountId": "111122223333",
            "AccountId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
            "Name": "MyChimeAccount",
            "AccountType": "Team",
            "CreatedTimestamp": "2019-01-04T17:11:22.003Z",
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

For more information, see `Getting Started <https://docs.aws.amazon.com/chime/latest/ag/getting-started.html>`_ in the *Amazon Chime Administration Guide*.