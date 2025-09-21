**To get details about a user**

The following ``get-user`` example retrieves the details for the specified user. ::

    aws chime get-user \
        --account-id a1b2c3d4-5678-90ab-cdef-11111EXAMPLE \
        --user-id a1b2c3d4-5678-90ab-cdef-22222EXAMPLE

Output::

    {
        "User": {
            "UserId": "a1b2c3d4-5678-90ab-cdef-22222EXAMPLE",
            "AccountId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
            "PrimaryEmail": "marthar@example.com",
            "DisplayName": "Martha Rivera",
            "LicenseType": "Pro",
            "UserRegistrationStatus": "Registered",
            "RegisteredOn": "2018-12-20T18:45:25.231Z",
            "InvitedOn": "2018-12-20T18:45:25.231Z",
            "AlexaForBusinessMetadata": {
                "IsAlexaForBusinessEnabled": False,
                "AlexaForBusinessRoomArn": "null"
            },
            "PersonalPIN": "XXXXXXXXXX"
        }
    }

For more information, see `Managing Users <https://docs.aws.amazon.com/chime/latest/ag/manage-users.html>`_ in the *Amazon Chime Administration Guide*.
