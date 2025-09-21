**To list the users in an account**

The following ``list-users`` example lists the users for the specified Amazon Chime account. ::

    aws chime list-users --account-id a1b2c3d4-5678-90ab-cdef-11111EXAMPLE

Output::

    {
        "Users": [
            {
                "UserId": "a1b2c3d4-5678-90ab-cdef-22222EXAMPLE",
                "AccountId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "PrimaryEmail": "mariag@example.com",
                "DisplayName": "Maria Garcia",
                "LicenseType": "Pro",
                "UserType": "PrivateUser",
                "UserRegistrationStatus": "Registered",
                "RegisteredOn": "2018-12-20T18:45:25.231Z"
                "AlexaForBusinessMetadata": {
                    "IsAlexaForBusinessEnabled": false
                }
            },
            {
                "UserId": "a1b2c3d4-5678-90ab-cdef-33333EXAMPLE",
                "AccountId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "PrimaryEmail": "richardr@example.com",
                "DisplayName": "Richard Roe",
                "LicenseType": "Pro",
                "UserType": "PrivateUser",
                "UserRegistrationStatus": "Registered",
                "RegisteredOn": "2018-12-20T18:45:45.415Z"
                "AlexaForBusinessMetadata": {
                    "IsAlexaForBusinessEnabled": false
                }
            },
            {
                "UserId": "a1b2c3d4-5678-90ab-cdef-44444EXAMPLE",
                "AccountId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "PrimaryEmail": "saanvis@example.com",
                "DisplayName": "Saanvi Sarkar",
                "LicenseType": "Basic",
                "UserType": "PrivateUser",
                "UserRegistrationStatus": "Registered",
                "RegisteredOn": "2018-12-20T18:46:57.747Z"
                "AlexaForBusinessMetadata": {
                    "IsAlexaForBusinessEnabled": false
                }
            },
            {
                "UserId": "a1b2c3d4-5678-90ab-cdef-55555EXAMPLE",
                "AccountId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "PrimaryEmail": "wxiulan@example.com",
                "DisplayName": "Wang Xiulan",
                "LicenseType": "Basic",
                "UserType": "PrivateUser",
                "UserRegistrationStatus": "Registered",
                "RegisteredOn": "2018-12-20T18:47:15.390Z"
                "AlexaForBusinessMetadata": {
                    "IsAlexaForBusinessEnabled": false
                }
            }
        ]
    }

For more information, see `Managing Users <https://docs.aws.amazon.com/chime/latest/ag/manage-users.html>`_ in the *Amazon Chime Administration Guide*.
