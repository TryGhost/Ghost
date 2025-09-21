**To get a list of accounts**

The following ``list-accounts`` example retrieves a list of the Amazon Chime accounts in the administrator's AWS account. ::

    aws chime list-accounts

Output::

    {
        "Accounts": [
            {
                "AwsAccountId": "111122223333",
                "AccountId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "Name": "First Chime Account",
                "AccountType": "EnterpriseDirectory",
                "CreatedTimestamp": "2018-12-20T18:38:02.181Z",
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
            },
            {
                "AwsAccountId": "111122223333",
                "AccountId": "a1b2c3d4-5678-90ab-cdef-22222EXAMPLE",
                "Name": "Second Chime Account",
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
        ]
    }

For more information, see `Managing Your Amazon Chime Accounts <https://docs.aws.amazon.com/chime/latest/ag/manage-chime-account.html>`_ in the *Amazon Chime Administration Guide*.
