**To reset a user's personal meeting PIN**

The following ``reset-personal-pin`` example resets the specified user's personal meeting PIN. ::

    aws chime reset-personal-pin \
        --account-id a1b2c3d4-5678-90ab-cdef-11111EXAMPLE 
        --user-id a1b2c3d4-5678-90ab-cdef-22222EXAMPLE

Output::

    {
        "User": {
            "UserId": "a1b2c3d4-5678-90ab-cdef-22222EXAMPLE",
            "AccountId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
            "PrimaryEmail": "mateo@example.com",
            "DisplayName": "Mateo Jackson",
            "LicenseType": "Pro",
            "UserType": "PrivateUser",
            "UserRegistrationStatus": "Registered",
            "RegisteredOn": "2018-12-20T18:45:25.231Z",
            "AlexaForBusinessMetadata": {
                "IsAlexaForBusinessEnabled": False,
                "AlexaForBusinessRoomArn": "null"
            },
            "PersonalPIN": "XXXXXXXXXX"
        }
    }

For more information, see `Changing Personal Meeting PINs <https://docs.aws.amazon.com/chime/latest/ag/change-PINs.html>`_ in the *Amazon Chime Administration Guide*.
